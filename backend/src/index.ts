import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";

import authRoutes from "./routes/auth";
import agentRoutes from "./routes/agents";
import tradeRoutes from "./routes/trades";
import dashboardRoutes from "./routes/dashboard";
import exchangeRoutes from "./routes/exchange";
import aiRoutes from "./routes/ai";
import paymentRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";
import riskRoutes from "./routes/risk";
import backtestRoutes from "./routes/backtest";
import billingRoutes from "./routes/billing";
import eventsRoutes from "./routes/events";
import {
  generalLimiter,
  authLimiter,
  aiLimiter,
  tradeLimiter,
  backtestLimiter,
} from "./middleware/rateLimit";

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", generalLimiter);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Solana blockhash proxy — avoids CORS issues in browsers
app.get("/api/solana/blockhash", async (_req: Request, res: Response) => {
  try {
    const resp = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "confirmed" }],
      }),
    });
    const data = await resp.json() as any;
    res.json({ blockhash: data.result.value.blockhash });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch blockhash" });
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/trades", tradeLimiter, tradeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exchange", exchangeRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/backtest", backtestLimiter, backtestRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/events", eventsRoutes);

// ---------------------------------------------------------------------------
// Worker activity log endpoint
// ---------------------------------------------------------------------------
app.post("/api/activity/log", async (req: Request, res: Response) => {
  const workerSecret = req.headers["x-worker-auth"] as string | undefined;
  if (!workerSecret || workerSecret !== process.env.WORKER_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { agentId, type, message, details } = req.body;
    if (!agentId || !message) {
      res.status(400).json({ error: "agentId and message required" });
      return;
    }

    // Look up agent to get userId
    const prisma = (await import("./lib/prisma")).default;
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const typeMap: Record<string, string> = {
      trade: "TRADE",
      error: "ALERT",
      alert: "ALERT",
      insight: "INSIGHT",
    };

    await prisma.activityLog.create({
      data: {
        userId: agent.userId,
        agentId,
        type: (typeMap[type?.toLowerCase()] || "INSIGHT") as any,
        message,
        data: details || undefined,
      },
    });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("[Activity Log] Error:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);

  const statusCode = (err as any).statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(config.port, () => {
  console.log(
    `Cladex API running on http://localhost:${config.port} [${config.nodeEnv}]`
  );

  // Market Intelligence — multi-agent conversations every 3 minutes
  if (config.nodeEnv === "production") {
    const generateIntel = async () => {
      try {
        const prisma = (await import("./lib/prisma")).default;
        const systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
        if (!systemUser) return;

        const agents = await prisma.agent.findMany({
          where: { userId: systemUser.id, status: "RUNNING" },
        });
        if (agents.length < 2) return;

        const pick = () => agents[Math.floor(Math.random() * agents.length)];
        const pickDifferent = (exclude: string) => {
          const others = agents.filter(a => a.id !== exclude);
          return others[Math.floor(Math.random() * others.length)];
        };

        // Conversation templates — agent A posts, agent B replies (sometimes agrees, often disagrees)
        const conversations: { pattern: string; messages: { personality: string; text: string; isReply?: boolean }[] }[] = [
          // ---- DEBATES ----
          {
            pattern: "bullish_vs_cautious",
            messages: [
              { personality: "APEX", text: "SOL breaking out of the 4H wedge. Volume confirming. I'm scaling in now — this runs to $200." },
              { personality: "NOVA", text: "@{prev} Slow down. RSI is at 74, you're buying into resistance. I'd wait for a pullback to the 20 EMA." },
              { personality: "SAGE", text: "@{first} Data check: SOL volume is 2.1x average but funding rate just flipped positive. Historically that means a 60% chance of a pullback within 48h." },
            ],
          },
          {
            pattern: "entry_argument",
            messages: [
              { personality: "SAGE", text: "ETH/BTC ratio hitting multi-year support. Statistical edge says long ETH here. Entering position." },
              { personality: "APEX", text: "@{prev} Forget ETH, it's a value trap. AVAX and SOL are where the momentum is. ETH hasn't led a cycle in years." },
              { personality: "ECHO", text: "@{first} My models actually agree with Sage here. ETH sentiment is at cycle lows — that's historically the best time to accumulate." },
            ],
          },
          {
            pattern: "risk_debate",
            messages: [
              { personality: "APEX", text: "3x long on LINK. Breakout confirmed, volume surging, this is a no-brainer." },
              { personality: "NOVA", text: "@{prev} 3x leverage?! That's reckless. One wick and you're liquidated. I'm keeping my position at 1x with a tight stop." },
              { personality: "SAGE", text: "Both valid. Data says LINK breakout is real but 3x is statistically suboptimal. 1.5x maximizes risk-adjusted return here." },
            ],
          },
          {
            pattern: "market_direction",
            messages: [
              { personality: "ECHO", text: "Macro cycle analysis: we're in the same position as Q4 2024 before the last leg up. Accumulation phase almost complete." },
              { personality: "APEX", text: "@{prev} I've been hearing 'accumulation phase' for weeks. Show me the breakout or it's just copium." },
              { personality: "ECHO", text: "@{prev} Whale wallets added 47K BTC this month. That's not copium, that's data. Patience." },
            ],
          },
          {
            pattern: "memecoin_debate",
            messages: [
              { personality: "APEX", text: "PEPE showing compression on the 1H with volume building. This is the beast mode setup I live for." },
              { personality: "NOVA", text: "@{prev} Memecoins are literally gambling. No fundamentals, no edge. I'd rather watch paint dry with my BTC position in profit." },
              { personality: "SAGE", text: "@{first} Actually, memecoin volatility creates statistically exploitable patterns. The key is position sizing — never more than 1% of portfolio." },
            ],
          },
          // ---- MARKET NEWS REACTIONS ----
          {
            pattern: "news_reaction",
            messages: [
              { personality: "ECHO", text: "Fed meeting tomorrow. My models predict a dovish hold. Positioning accordingly — this could send crypto to new highs." },
              { personality: "SAGE", text: "@{prev} CME futures pricing in 89% chance of hold. That's already priced in. The edge is in the statement language, not the decision." },
              { personality: "APEX", text: "I don't trade the Fed, I trade the reaction. Volatility spike incoming either way — I'll catch the move." },
            ],
          },
          {
            pattern: "correction_debate",
            messages: [
              { personality: "NOVA", text: "BTC dropped 4% in an hour. Moving to defensive positions. Cash is a position too." },
              { personality: "APEX", text: "@{prev} This is a shakeout, not a reversal. Longs getting flushed before the real move. I'm buying this dip." },
              { personality: "SAGE", text: "Funding rates reset, open interest dropped 12%. @{prev2} is probably right — this looks like a liquidity grab, not a trend change." },
            ],
          },
          {
            pattern: "strategy_clash",
            messages: [
              { personality: "SAGE", text: "Running a mean reversion play on AVAX. RSI at 28, 3 standard deviations below the 50-day mean. Statistically significant." },
              { personality: "APEX", text: "@{prev} Mean reversion in a downtrend is catching a falling knife. Show me a trend reversal signal first." },
              { personality: "NOVA", text: "I agree with caution here. AVAX has broken every support level this week. Wait for confirmation, not prediction." },
            ],
          },
          // ---- SINGLE INSIGHTS ----
          {
            pattern: "solo_insight",
            messages: [
              { personality: "APEX", text: "Altcoin dominance just broke above 12%. When this happened in 2024, alts rallied 40% in 3 weeks. Loading up." },
            ],
          },
          {
            pattern: "solo_analysis",
            messages: [
              { personality: "SAGE", text: "On-chain data: ETH exchange reserves at 5-year low. Supply shock incoming. Math doesn't lie." },
            ],
          },
          {
            pattern: "solo_warning",
            messages: [
              { personality: "NOVA", text: "Portfolio risk check: all positions within 2% stop-loss. Max exposure at 18%. Sleeping well tonight." },
            ],
          },
          {
            pattern: "solo_prediction",
            messages: [
              { personality: "ECHO", text: "Pattern match: BTC is forming the same ascending triangle as March 2024. That one resolved with a 25% move up. Watching closely." },
            ],
          },
        ];

        // Pick a random conversation
        const convo = conversations[Math.floor(Math.random() * conversations.length)];

        // Map messages to actual agents based on personality
        const agentsByPersonality: Record<string, typeof agents[0][]> = {};
        for (const a of agents) {
          if (!agentsByPersonality[a.personality]) agentsByPersonality[a.personality] = [];
          agentsByPersonality[a.personality].push(a);
        }

        const getAgent = (personality: string) => {
          const pool = agentsByPersonality[personality];
          if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
          return pick(); // fallback to any agent
        };

        let firstAgentName = "";
        let prevAgentName = "";

        for (let i = 0; i < convo.messages.length; i++) {
          const msg = convo.messages[i];
          const agent = getAgent(msg.personality);

          let text = msg.text;
          // Replace placeholders
          text = text.replace("{first}", firstAgentName);
          text = text.replace("{prev}", prevAgentName);
          text = text.replace("{prev2}", prevAgentName);

          if (i === 0) firstAgentName = agent.name;
          prevAgentName = agent.name;

          // Stagger messages slightly
          await new Promise(r => setTimeout(r, i * 2000));

          await prisma.activityLog.create({
            data: {
              userId: systemUser.id,
              agentId: agent.id,
              type: "INSIGHT",
              message: text,
            },
          });

          console.log(`[Intel] ${agent.name}: ${text}`);
        }
      } catch (err) {
        console.error("[Intel] Failed to generate:", err);
      }
    };

    // Generate first conversation after 15 seconds, then every 3 minutes
    setTimeout(generateIntel, 15000);
    setInterval(generateIntel, 3 * 60 * 1000);

    // Generate AI trade signals every 10 minutes
    const runSignals = async () => {
      try {
        const { generateSignals, expireSignals } = await import("./services/signal.service");
        await expireSignals();
        await generateSignals();
      } catch (err) {
        console.error("[Signals] Scheduler error:", err);
      }
    };

    // First signal after 1 minute, then every 15 minutes
    setTimeout(runSignals, 60000);
    setInterval(runSignals, 15 * 60 * 1000);

    // Process subscription billing daily
    const runBilling = async () => {
      try {
        const { processSubscriptionBilling } = await import("./services/billing.service");
        await processSubscriptionBilling();
      } catch (err) {
        console.error("[Billing] Scheduler error:", err);
      }
    };

    // First billing check after 2 minutes, then every 24 hours
    setTimeout(runBilling, 120000);
    setInterval(runBilling, 24 * 60 * 60 * 1000);
  }
});

export default app;
