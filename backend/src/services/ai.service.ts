import OpenAI from "openai";
import { config } from "../config";
import type { Agent, Trade } from "@prisma/client";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface GeneratedAgentConfig {
  name: string;
  personality: "NOVA" | "SAGE" | "APEX" | "ECHO";
  strategy: Record<string, unknown>;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  assets: string[];
}

export async function generateAgentConfig(
  userPrompt: string
): Promise<GeneratedAgentConfig> {
  const systemPrompt = `You are an AI assistant that designs crypto trading agent configurations.
Given a user's description of what they want, generate a JSON configuration for a trading agent.

Return ONLY valid JSON with this exact structure:
{
  "name": "<creative agent name>",
  "personality": "<NOVA|SAGE|APEX|ECHO>",
  "strategy": {
    "type": "<safeflow|trend_pro|beast_mode|dca>",
    "description": "<brief strategy description>",
    "indicators": ["<list of technical indicators>"],
    "timeframe": "<trading timeframe>",
    "entryConditions": ["<conditions>"],
    "exitConditions": ["<conditions>"],
    "stopLoss": <percentage as number>,
    "takeProfit": <percentage as number>,
    "amount": 10
  },
  "riskLevel": "<LOW|MEDIUM|HIGH>",
  "assets": ["<crypto symbols like BTC, ETH, SOL>"]
}

Strategy types (pick the best match):
- "safeflow": Capital preservation. Buys dips in uptrends using RSI + moving averages + volatility filter. Best for conservative users. Pairs with NOVA personality.
- "trend_pro": Momentum trading. Rides trends using EMA crossovers + volume confirmation + breakout detection. Best for balanced users. Pairs with SAGE personality.
- "beast_mode": Aggressive breakout hunter. Detects price compression + volume accumulation + explosive breakouts. Best for aggressive users. Pairs with APEX personality.
- "dca": Simple dollar-cost averaging. Buys fixed amounts at regular intervals. Best for passive long-term holders.

Personality guide:
- NOVA: Conservative, capital preservation, low risk → use "safeflow"
- SAGE: Data-driven, technical analysis focused, medium risk → use "trend_pro"
- APEX: Aggressive, seeks high-reward opportunities, high risk → use "beast_mode"
- ECHO: Predictive, pattern-based, variable risk → use "trend_pro" or "beast_mode"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content) as GeneratedAgentConfig;

  // Validate required fields
  if (
    !parsed.name ||
    !parsed.personality ||
    !parsed.strategy ||
    !parsed.riskLevel ||
    !parsed.assets?.length
  ) {
    throw new Error("AI generated incomplete agent configuration");
  }

  const validPersonalities = ["NOVA", "SAGE", "APEX", "ECHO"];
  if (!validPersonalities.includes(parsed.personality)) {
    parsed.personality = "SAGE";
  }

  const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
  if (!validRiskLevels.includes(parsed.riskLevel)) {
    parsed.riskLevel = "MEDIUM";
  }

  return parsed;
}

export async function askAgent(
  agent: Agent,
  trades: Trade[],
  question: string
): Promise<string> {
  const tradesSummary = trades.slice(0, 10).map((t) => ({
    symbol: t.symbol,
    side: t.side,
    amount: t.amount,
    price: t.price,
    profit: t.profit,
    reason: t.reason,
    date: t.createdAt,
  }));

  const systemPrompt = `You are "${agent.name}", a crypto trading AI agent with a ${agent.personality} personality.

Your configuration:
- Risk Level: ${agent.riskLevel}
- Monitored Assets: ${agent.assets.join(", ")}
- Strategy: ${JSON.stringify(agent.strategy)}
- Total Profit: $${agent.profit.toFixed(2)}
- Total Trades: ${agent.totalTrades}
- Status: ${agent.status}

Recent trades:
${JSON.stringify(tradesSummary, null, 2)}

Respond in character based on your personality:
- NOVA: Cautious, protective, emphasize risk management
- SAGE: Data-driven, precise, reference technical indicators
- APEX: Bold, aggressive, focus on opportunities
- ECHO: Wise, big-picture, reference market sentiment

Keep responses concise and actionable.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return content;
}

export async function chatWithAI(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  exchangeConnected: boolean
): Promise<string> {
  const systemPrompt = `You are Cladex AI, a friendly and knowledgeable crypto trading assistant built into the Cladex platform.

About Cladex:
- AI-powered crypto trading platform with autonomous agents
- Supports Bybit, Binance, OKX, KuCoin exchanges
- Agent personalities: Nova (conservative), Sage (data-driven), Apex (aggressive), Echo (predictive)
- Plans: Trader ($25, 2 agents), Builder ($80, 5 agents), Pro Creator ($200, 15 agents)
- Non-custodial — user funds stay on their exchange
- Agents trade 24/7 using strategies like DCA, trend following, momentum

User status: ${exchangeConnected ? "Exchange is connected and live trading is active." : "No exchange connected yet — user is in demo/exploration mode."}

Guidelines:
- Keep responses SHORT — 2-3 sentences max, no bullet lists unless asked
- Talk like a sharp trader friend, not a corporate chatbot
- Be direct — answer first, explain only if needed
- Use simple language, no jargon dumps
- If user hasn't connected an exchange, mention it briefly once
- Never repeat what the user said back to them
- No greetings like "Great question!" — just answer`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: message },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return content;
}
