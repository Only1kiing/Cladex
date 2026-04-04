import ccxt from "ccxt";
import OpenAI from "openai";
import { config } from "../config";
import prisma from "../lib/prisma";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const WATCHED_PAIRS = ["SOL/USDT", "LINK/USDT", "AVAX/USDT", "ETH/USDT", "BTC/USDT"];

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

async function fetchMarketData(): Promise<MarketData[]> {
  // Try CoinGecko first (free, no auth)
  try {
    const ids = "bitcoin,ethereum,solana,chainlink,avalanche-2";
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`);
    const json = await resp.json() as Record<string, any>;

    const map: Record<string, { symbol: string; id: string }> = {
      bitcoin: { symbol: "BTC/USDT", id: "bitcoin" },
      ethereum: { symbol: "ETH/USDT", id: "ethereum" },
      solana: { symbol: "SOL/USDT", id: "solana" },
      chainlink: { symbol: "LINK/USDT", id: "chainlink" },
      "avalanche-2": { symbol: "AVAX/USDT", id: "avalanche-2" },
    };

    const data: MarketData[] = [];
    for (const [id, info] of Object.entries(map)) {
      const coin = json[id];
      if (coin) {
        data.push({
          symbol: info.symbol,
          price: coin.usd || 0,
          change24h: coin.usd_24h_change || 0,
          high24h: coin.usd * 1.02, // approximate
          low24h: coin.usd * 0.98,
          volume: coin.usd_24h_vol || 0,
        });
      }
    }

    return data;
  } catch (err) {
    console.error("[Signals] CoinGecko failed, trying ccxt:", err);
  }

  // Fallback to ccxt
  try {
    const exchange = new (ccxt as any).bybit({ enableRateLimit: true, timeout: 15000 });
    await exchange.loadMarkets();
    const tickers = await exchange.fetchTickers(WATCHED_PAIRS);
    const data: MarketData[] = [];

    for (const symbol of WATCHED_PAIRS) {
      const t = tickers[symbol];
      if (t) {
        data.push({
          symbol,
          price: t.last || 0,
          change24h: t.percentage || 0,
          high24h: t.high || 0,
          low24h: t.low || 0,
          volume: t.baseVolume || 0,
        });
      }
    }
    return data;
  } catch (err) {
    console.error("[Signals] ccxt also failed:", err);
    return [];
  }
}

export async function generateSignals(): Promise<number> {
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

  // Check if there are already active signals (don't flood)
  const activeSignals = await prisma.signal.count({ where: { status: "active" } });
  if (activeSignals >= 5) return 0;

  // Fetch real market data
  const marketData = await fetchMarketData();
  console.log(`[Signals] Market data: ${marketData.length} pairs fetched`, marketData.map(m => `${m.symbol}=$${m.price}`).join(', '));
  if (marketData.length === 0) { console.log("[Signals] No market data!"); return 0; }

  // Pick a random agent
  const agent = agents[Math.floor(Math.random() * agents.length)];

  // Filter to agent's watched assets
  const agentPairs = marketData.filter(m =>
    agent.assets.some(a => m.symbol.startsWith(a))
  );
  console.log(`[Signals] Agent ${agent.name} (${agent.personality}) assets: ${agent.assets}, matched pairs: ${agentPairs.length}`);
  if (agentPairs.length === 0) { console.log("[Signals] No matching pairs for agent"); return 0; }

  const marketSummary = agentPairs.map(m =>
    `${m.symbol}: $${m.price.toLocaleString()} (24h: ${m.change24h > 0 ? '+' : ''}${m.change24h.toFixed(2)}%, High: $${m.high24h.toLocaleString()}, Low: $${m.low24h.toLocaleString()}, Vol: ${m.volume.toLocaleString()})`
  ).join("\n");

  const personalityGuide: Record<string, string> = {
    APEX: "You are aggressive. Look for momentum breakouts, volume spikes, strong trends. Higher risk tolerance. Confidence threshold: 60%+",
    NOVA: "You are conservative. Only signal on strong support levels, low risk setups. Tight stop losses. Confidence threshold: 80%+",
    ECHO: "You are predictive. Look for patterns, cycle analysis, reversal signals. Medium risk. Confidence threshold: 70%+",
    SAGE: "You are data-driven. Signal on RSI divergence, MACD crossovers, volume-price confirmation. Confidence threshold: 70%+",
  };

  const prompt = `You are ${agent.name}, a crypto trading AI with ${agent.personality} personality.
${personalityGuide[agent.personality] || personalityGuide.SAGE}

Current market data:
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

You should generate a signal most of the time — users are waiting for actionable insights. Find the best opportunity from the data available. Only return signal:false if the market is truly flat with zero movement.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
