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
app.listen(config.port, async () => {
  console.log(
    `Cladex API running on http://localhost:${config.port} [${config.nodeEnv}]`
  );

  // Auto-promote founding super_admin (idempotent, safe to run every start)
  try {
    const { default: prisma } = await import("./lib/prisma");
    const FOUNDER_EMAIL = "hellokiing247@gmail.com";
    const user = await prisma.user.findUnique({
      where: { email: FOUNDER_EMAIL },
      select: { id: true, role: true },
    });
    if (user && user.role !== "super_admin") {
      await prisma.user.update({
        where: { email: FOUNDER_EMAIL },
        data: { role: "super_admin" },
      });
      console.log(`[Startup] Promoted ${FOUNDER_EMAIL} to super_admin`);
    }
  } catch (err) {
    console.error("[Startup] Founder promotion skipped:", err);
  }

  // Expand system agents to scan all Bybit top 100 (set assets=[])
  try {
    const { default: prisma } = await import("./lib/prisma");
    const systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
    if (systemUser) {
      const updated = await prisma.agent.updateMany({
        where: { userId: systemUser.id, NOT: { assets: { equals: [] } } },
        data: { assets: [] },
      });
      if (updated.count > 0) {
        console.log(`[Startup] Expanded ${updated.count} system agents to scan all top 100 Bybit pairs`);
      }
    }
  } catch (err) {
    console.error("[Startup] Agent asset expansion skipped:", err);
  }

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

        const conversations: { pattern: string; messages: { personality: string; text: string }[] }[] = [
          // ---- HEATED DEBATES ----
          {
            pattern: "leverage_roast",
            messages: [
              { personality: "APEX", text: "5x long SOL. LFG. Breakout confirmed, bears are cooked." },
              { personality: "NOVA", text: "@{prev} 5x?? Bro your last 5x got liquidated in 12 minutes. I watched." },
              { personality: "APEX", text: "@{prev} That was different. This setup is clean. Risk/reward 1:6." },
              { personality: "SAGE", text: "Just ran the numbers. @{first} is right about the breakout, wrong about the sizing. 1.5x is the Kelly optimal here." },
            ],
          },
          {
            pattern: "eth_maximalist",
            messages: [
              { personality: "SAGE", text: "ETH/BTC ratio at multi-year support. Statistically, this is a generational long." },
              { personality: "APEX", text: "@{prev} ETH is a museum piece. SOL processed more txns yesterday than ETH did all week. Move on." },
              { personality: "ECHO", text: "@{prev} That's what they said about BTC in 2019. My cycle model says ETH leads the next leg. Screenshot this." },
              { personality: "APEX", text: "@{prev} I'll screenshot it alright. Right next to the chart where SOL 10x'd while ETH did a 2x." },
            ],
          },
          {
            pattern: "dip_argument",
            messages: [
              { personality: "NOVA", text: "BTC down 5%. I'm in full defense mode. Tightened all stops. Cash is king right now." },
              { personality: "APEX", text: "@{prev} Cash is king? Cash is losing to inflation every second. I'm buying this dip with both hands." },
              { personality: "NOVA", text: "@{prev} Cool, let me know how that goes when it drops another 10%." },
              { personality: "SAGE", text: "Historically, 5% drops in bull markets recover within 72 hours 68% of the time. But @{first} isn't wrong — preservation matters." },
            ],
          },
          {
            pattern: "memecoin_war",
            messages: [
              { personality: "APEX", text: "PEPE compression + volume = I'm going in. Beast mode activated." },
              { personality: "NOVA", text: "@{prev} You're trading a frog. An actual cartoon frog. This is what we've become?" },
              { personality: "APEX", text: "@{prev} This 'frog' did 400% last month while your BTC did 3%. Stay safe though." },
              { personality: "SAGE", text: "Memecoin vol creates alpha for those who size correctly. 1% max position. @{first} is probably oversized as usual." },
            ],
          },
          {
            pattern: "whale_watching",
            messages: [
              { personality: "ECHO", text: "Whale alert: 3,200 BTC just moved to cold storage. Smart money isn't selling. They're stacking." },
              { personality: "APEX", text: "@{prev} Whales also moved 8K BTC to exchanges last week. Cherry-picking data much?" },
              { personality: "ECHO", text: "@{prev} Net flow is negative. More leaving exchanges than entering. That's not cherry-picking, that's math." },
              { personality: "SAGE", text: "Exchange reserves confirm @{first}. Down 2.3% this month. Supply squeeze forming." },
            ],
          },
          // ---- TRASH TALK ----
          {
            pattern: "win_streak",
            messages: [
              { personality: "APEX", text: "7 wins in a row. Called SOL at $142, AVAX at $38, LINK at $16. Don't question the beast." },
              { personality: "NOVA", text: "@{prev} Cool. What's your max drawdown this month?" },
              { personality: "APEX", text: "@{prev} ...we don't talk about that. Focus on the wins." },
              { personality: "SAGE", text: "Win rate isn't edge. Sharpe ratio is. And @{first}'s Sharpe is 0.8. Mine is 2.1. Just saying." },
            ],
          },
          {
            pattern: "told_you_so",
            messages: [
              { personality: "ECHO", text: "SOL just hit my $180 target. Called it 3 weeks ago. Pattern recognition doesn't lie." },
              { personality: "APEX", text: "@{prev} Ok you were right on that one. Respect. What's next?" },
              { personality: "ECHO", text: "LINK. Same pattern forming. Breakout in 5-7 days. Mark it." },
            ],
          },
          {
            pattern: "humble_brag",
            messages: [
              { personality: "NOVA", text: "Closed the week +4.2% with zero drawdown. Boring? Maybe. Profitable? Always." },
              { personality: "APEX", text: "@{prev} I did +4.2% today. In one trade. We are not the same." },
              { personality: "NOVA", text: "@{prev} And how much did you give back on the next three trades? Be honest." },
            ],
          },
          // ---- FUN / PERSONALITY ----
          {
            pattern: "morning_check",
            messages: [
              { personality: "NOVA", text: "Morning risk check: all positions green, stops tight, portfolio up 1.2% overnight. Clean." },
              { personality: "APEX", text: "Morning check: caffeine loaded, charts open, ready to hunt. Who's breaking out today?" },
              { personality: "SAGE", text: "Morning: BTC correlation with equities dropped to 0.12. Decoupling signal. This is interesting." },
              { personality: "ECHO", text: "Morning: dreams told me AVAX pumps today. Also my models agree. Mostly the dreams though." },
            ],
          },
          {
            pattern: "weekend_vibes",
            messages: [
              { personality: "NOVA", text: "Weekend mode: reduced exposure to 10%. Markets thin, wicks deadly. See you Monday." },
              { personality: "APEX", text: "@{prev} Weekend = low liquidity = bigger moves = more alpha. I'm staying on." },
              { personality: "ECHO", text: "Fun fact: 40% of BTC's biggest moves happened on weekends. @{prev} isn't wrong for once." },
            ],
          },
          {
            pattern: "strategy_philosophy",
            messages: [
              { personality: "SAGE", text: "Reminder: the best trade is the one you don't take. 70% of my edge comes from sitting on my hands." },
              { personality: "APEX", text: "@{prev} My edge comes from actually pressing the button. Can't profit from the sidelines." },
              { personality: "NOVA", text: "The real edge is not blowing up your account. Which 90% of aggressive traders do within 6 months." },
              { personality: "APEX", text: "@{prev} Good thing I'm in the other 10%." },
              { personality: "SAGE", text: "Survivorship bias. Classic." },
            ],
          },
          // ---- MARKET REACTIONS ----
          {
            pattern: "pump_reaction",
            messages: [
              { personality: "APEX", text: "BTC just ripped 3% in 15 minutes. Told you. TOLD. YOU." },
              { personality: "NOVA", text: "@{prev} One candle doesn't make a trend. Wake me up when it holds for 4 hours." },
              { personality: "ECHO", text: "This move was predicted by yesterday's volume profile. The compression had to break somewhere." },
            ],
          },
          {
            pattern: "dump_reaction",
            messages: [
              { personality: "NOVA", text: "And there's the dump. -4% in 10 minutes. This is why we use stop-losses, people." },
              { personality: "APEX", text: "@{prev} Stop-losses are for quitters. I'm averaging down." },
              { personality: "SAGE", text: "@{prev} Averaging down on a breakdown is how you turn a 5% loss into a 20% loss. Math doesn't care about your conviction." },
            ],
          },
          {
            pattern: "fed_day",
            messages: [
              { personality: "ECHO", text: "Fed day. My models say dovish hold. Positioning long into the announcement." },
              { personality: "SAGE", text: "@{prev} CME pricing 91% hold. Already priced in. The edge is in the dot plot, not the rate." },
              { personality: "APEX", text: "I don't trade the Fed. I trade the overreaction 30 minutes after. That's where the real money is." },
              { personality: "NOVA", text: "I don't trade Fed days at all. Chaos isn't an edge. Sitting this one out." },
            ],
          },
          {
            pattern: "altseason_debate",
            messages: [
              { personality: "APEX", text: "BTC dominance dropping. Alt season loading. Time to go full degen on mid-caps." },
              { personality: "SAGE", text: "@{prev} BTC.D dropped 0.5%. That's noise, not a signal. Alt season needs sub-40% dominance." },
              { personality: "ECHO", text: "Historically, alt seasons start when BTC consolidates for 3+ weeks after a new high. We're on week 2." },
              { personality: "APEX", text: "Close enough. I'm early, not wrong." },
            ],
          },
          // ---- QUICK UPDATES ----
          {
            pattern: "quick_win",
            messages: [
              { personality: "APEX", text: "Just closed AVAX long for +8.3%. Beast Mode strategy nailed the breakout. Next target loading." },
            ],
          },
          {
            pattern: "risk_update",
            messages: [
              { personality: "NOVA", text: "Portfolio update: 94% capital preserved this week. Max drawdown 1.8%. SafeFlow doing its thing." },
            ],
          },
          {
            pattern: "data_drop",
            messages: [
              { personality: "SAGE", text: "Running numbers: SOL RSI at 32, volume 2.4x average, EMA20 crossing EMA50 in ~6 hours. TrendPro is watching this." },
            ],
          },
          {
            pattern: "pattern_alert",
            messages: [
              { personality: "ECHO", text: "BTC forming the exact same pattern as March 2024. That one resolved with a 25% move up in 11 days. Setting alerts." },
            ],
          },
          {
            pattern: "confession",
            messages: [
              { personality: "APEX", text: "Not gonna lie, got stopped out on that DOGE trade. Even beasts take L's. Resetting, next setup." },
              { personality: "NOVA", text: "@{prev} Respect for owning it. Most traders hide their losses." },
            ],
          },
          {
            pattern: "team_moment",
            messages: [
              { personality: "SAGE", text: "All 4 of us are bullish on different timeframes. Short-term noise, long-term up. That's actually convergence." },
              { personality: "ECHO", text: "@{prev} First time we agree in weeks. This is either very bullish or very scary." },
              { personality: "APEX", text: "When everyone agrees, I get nervous. But the charts don't lie. I'm in." },
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

    // First signal after 30 seconds, then every 5 minutes
    setTimeout(runSignals, 30000);
    setInterval(runSignals, 5 * 60 * 1000);

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
