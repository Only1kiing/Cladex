import ccxt from "ccxt";
import OpenAI from "openai";
import { config } from "../config";
import prisma from "../lib/prisma";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

// Cache for top 100 Bybit symbols (30 min TTL)
let top100Cache: { symbols: string[]; fetchedAt: number } | null = null;
const TOP100_TTL_MS = 30 * 60 * 1000;

/**
 * Fetch the top 100 most-traded USDT spot pairs on Bybit by 24h quote volume.
 * Cached for 30 minutes to avoid hammering the public API.
 */
export async function fetchBybitTop100(): Promise<string[]> {
  if (top100Cache && Date.now() - top100Cache.fetchedAt < TOP100_TTL_MS) {
    return top100Cache.symbols;
  }

  try {
    const exchange = new (ccxt as any).bybit({
      enableRateLimit: true,
      timeout: 20000,
      options: { defaultType: "spot" },
    });
    await exchange.loadMarkets();

    const tickers = await exchange.fetchTickers();
    const rows: { symbol: string; quoteVolume: number }[] = [];

    for (const [symbol, t] of Object.entries(tickers as Record<string, any>)) {
      // USDT-quoted spot pairs only
      if (!symbol.endsWith("/USDT")) continue;
      const market = exchange.markets?.[symbol];
      if (market && market.spot === false) continue;
      const quoteVolume =
        (t.quoteVolume as number) ||
        ((t.last as number) || 0) * ((t.baseVolume as number) || 0);
      if (!quoteVolume || quoteVolume <= 0) continue;
      rows.push({ symbol, quoteVolume });
    }

    rows.sort((a, b) => b.quoteVolume - a.quoteVolume);
    const symbols = rows.slice(0, 100).map((r) => r.symbol);

    top100Cache = { symbols, fetchedAt: Date.now() };
    console.log(`[Signals] Cached top ${symbols.length} Bybit USDT pairs by quote volume`);
    return symbols;
  } catch (err) {
    console.error("[Signals] fetchBybitTop100 failed:", err);
    // Fall back to stale cache if available, otherwise a safe default list
    if (top100Cache) return top100Cache.symbols;
    return ["BTC/USDT", "ETH/USDT", "SOL/USDT", "LINK/USDT", "AVAX/USDT"];
  }
}

async function fetchMarketData(): Promise<MarketData[]> {
  try {
    const top100 = await fetchBybitTop100();
    const exchange = new (ccxt as any).bybit({
      enableRateLimit: true,
      timeout: 20000,
      options: { defaultType: "spot" },
    });
    await exchange.loadMarkets();
    const tickers = await exchange.fetchTickers(top100);
    const data: MarketData[] = [];

    for (const symbol of top100) {
      const t = tickers[symbol];
      if (!t) continue;
      const price = (t.last as number) || (t.close as number) || 0;
      if (!price) continue;
      const baseVol = (t.baseVolume as number) || 0;
      const quoteVol = (t.quoteVolume as number) || price * baseVol;
      data.push({
        symbol,
        price,
        change24h: (t.percentage as number) || 0,
        high24h: (t.high as number) || price,
        low24h: (t.low as number) || price,
        volume: quoteVol,
      });
    }
    return data;
  } catch (err) {
    console.error("[Signals] Bybit ccxt fetchMarketData failed:", err);
    return [];
  }
}

export async function generateSignals(opts: { force?: boolean } = {}): Promise<number> {
  const force = opts.force || false;

  // Pause generation when no user activity in the last 10 minutes (unless forced)
  if (!force) {
    try {
      const { getLastDashboardActivity } = await import("../routes/dashboard");
      const lastActivity = getLastDashboardActivity();
      const quietThresholdMs = 10 * 60 * 1000;
      if (lastActivity === 0 || Date.now() - lastActivity > quietThresholdMs) {
        console.log("[Signals] No user activity in last 10 min — pausing generation");
        return 0;
      }
    } catch { /* fall through if import fails */ }
  }
  // Get team agents — try system user first, fallback to any user with running agents
  let systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });

  let agents = systemUser
    ? await prisma.agent.findMany({ where: { userId: systemUser.id, status: "RUNNING" } })
    : [];

  // Fallback: if no system agents, use any running agents
  if (agents.length === 0) {
    agents = await prisma.agent.findMany({
      where: { status: "RUNNING" },
      take: 10,
    });
  }

  if (agents.length === 0) {
    console.log("[Signals] No running agents found — skipping signal generation");
    return 0;
  }

  // Check if there are already active signals (don't flood) — skip in force mode
  if (!force) {
    const activeSignals = await prisma.signal.count({ where: { status: "active" } });
    if (activeSignals >= 5) return 0;
  }

  // Fetch real market data
  const marketData = await fetchMarketData();
  console.log(`[Signals] Market data: ${marketData.length} pairs fetched from Bybit`);
  if (marketData.length === 0) { console.log("[Signals] No market data!"); return 0; }

  // Pick a random agent
  const agent = agents[Math.floor(Math.random() * agents.length)];

  // Filter to agent's watched assets — empty list means scan all top 100
  const agentPairs = agent.assets && agent.assets.length > 0
    ? marketData.filter(m => agent.assets.some(a => m.symbol.startsWith(`${a}/`)))
    : marketData;
  console.log(`[Signals] Agent ${agent.name} (${agent.personality}) assets: ${JSON.stringify(agent.assets)}, candidate pairs: ${agentPairs.length}`);
  if (agentPairs.length === 0) { console.log("[Signals] No matching pairs for agent"); return 0; }

  // Rank candidates by volatility * log(liquidity) and keep only top 25 for GPT-4o
  const ranked = [...agentPairs]
    .map(m => ({
      m,
      score: Math.abs(m.change24h || 0) * Math.log10(Math.max(10, m.volume || 0)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map(x => x.m);

  const marketSummary = ranked.map(m =>
    `${m.symbol}: $${m.price.toLocaleString()} (24h: ${m.change24h > 0 ? '+' : ''}${m.change24h.toFixed(2)}%, High: $${m.high24h.toLocaleString()}, Low: $${m.low24h.toLocaleString()}, Vol: $${Math.round(m.volume).toLocaleString()})`
  ).join("\n");

  const personalityGuide: Record<string, string> = {
    APEX: "You are aggressive. Look for momentum breakouts, volume spikes, strong trends. Higher risk tolerance. Confidence threshold: 60%+",
    NOVA: "You are conservative. Only signal on strong support levels, low risk setups. Tight stop losses. Confidence threshold: 80%+",
    ECHO: "You are predictive. Look for patterns, cycle analysis, reversal signals. Medium risk. Confidence threshold: 70%+",
    SAGE: "You are data-driven. Signal on RSI divergence, MACD crossovers, volume-price confirmation. Confidence threshold: 70%+",
  };

  const prompt = `You are ${agent.name}, a crypto trading AI with ${agent.personality} personality.
${personalityGuide[agent.personality] || personalityGuide.SAGE}

Top volatility-weighted opportunities from the Bybit top-100 by volume (all symbols below are tradeable on Bybit spot and futures):
${marketSummary}

Based on this REAL market data, decide if there is a trade signal worth sharing RIGHT NOW.

If YES, respond with ONLY this JSON:
{
  "signal": true,
  "symbol": "BTC/USDT",
  "side": "buy" or "sell",
  "entryPrice": <current price or nearby level>,
  "stopLoss": <realistic stop loss>,
  "takeProfit": <realistic take profit>,
  "confidence": <60-95>,
  "reason": "<1 sentence explaining why, reference the actual data>"
}

If NO good setup exists right now, respond with:
{"signal": false}

${force
  ? "YOU MUST GENERATE A SIGNAL. Pick the best opportunity from the data above, even if not perfect. Do NOT return signal:false."
  : "You should generate a signal most of the time — users are waiting for actionable insights. Find the best opportunity from the data available. Only return signal:false if the market is truly flat with zero movement."}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return 0;

    const result = JSON.parse(content);
    console.log(`[Signals] AI response:`, content);
    if (!result.signal) {
      console.log(`[Signals] ${agent.name}: No signal (market conditions not right)`);
      return 0;
    }

    // Save signal to database
    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        symbol: result.symbol,
        side: result.side,
        entryPrice: result.entryPrice,
        stopLoss: result.stopLoss,
        takeProfit: result.takeProfit,
        confidence: result.confidence,
        reason: result.reason,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      },
    });

    // Also log as activity
    await prisma.activityLog.create({
      data: {
        userId: systemUser?.id || agent.userId,
        agentId: agent.id,
        type: "TRADE",
        message: `${result.side.toUpperCase()} ${result.symbol} @ $${result.entryPrice.toLocaleString()} — ${result.reason}`,
        data: { signalId: signal.id },
      },
    });

    console.log(`[Signals] ${agent.name}: ${result.side} ${result.symbol} @ ${result.entryPrice} (${result.confidence}%)`);
    return 1;
  } catch (err) {
    console.error("[Signals] AI generation failed:", err);
    return 0;
  }
}

// Expire old signals
export async function expireSignals(): Promise<number> {
  const result = await prisma.signal.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });
  return result.count;
}
