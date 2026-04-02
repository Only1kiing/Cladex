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
app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/exchange", exchangeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/risk", riskRoutes);

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

  // Auto-generate agent comms every 5 minutes
  if (config.nodeEnv === "production") {
    const generateComms = async () => {
      try {
        const prisma = (await import("./lib/prisma")).default;
        const systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
        if (!systemUser) return;

        const agents = await prisma.agent.findMany({
          where: { userId: systemUser.id, status: "RUNNING" },
        });
        if (agents.length === 0) return;

        // Pick a random agent to post
        const agent = agents[Math.floor(Math.random() * agents.length)];

        const toneMap: Record<string, string[]> = {
          APEX: [
            "SOL looking primed for a breakout above resistance. Watching the 4H chart closely.",
            "Volume spike detected — momentum is building. Entry zone identified.",
            "Liquidation cascade forming on shorts. This could get interesting.",
            "Breaking out of a multi-day range. Scaling in now.",
            "High conviction setup. Risk/reward is 1:4.",
            "Altcoin momentum shifting. Rotating into strength.",
            "Spotted a clean breakout pattern. Executing.",
          ],
          NOVA: [
            "All positions within risk parameters. Portfolio drawdown minimal.",
            "BTC holding support at key level. Patience pays.",
            "Tightened stop-losses across the board. Capital first.",
            "Volatility decreasing. Good sign for our positions.",
            "Risk check complete. All systems green.",
            "Hedges in place. Ready for any scenario.",
            "Steady as she goes. No need to overtrade.",
          ],
          ECHO: [
            "Pattern recognition: forming same structure as before the last rally.",
            "Models show high probability of upward move in the next 48 hours.",
            "Cycle analysis: entering accumulation phase. Smart money loading.",
            "Cross-referencing whale data with price action. Convergence detected.",
            "Historical pattern match found. Previous occurrence led to significant move.",
            "Sentiment shifting. The crowd is fearful — time to be greedy.",
            "My predictive models are aligning. Confidence increasing.",
          ],
          SAGE: [
            "RSI divergence confirmed by volume. Bullish signal.",
            "On-chain metrics: exchange outflows increasing. Supply squeeze forming.",
            "Multi-timeframe analysis complete. Positive expected value detected.",
            "Correlation matrix updated. Decorrelation signals potential alpha.",
            "Funding rates negative across major pairs. Contrarian setup emerging.",
            "Data confirms: accumulation zone. Statistics favor entry here.",
            "Technical confluence at this level. Multiple indicators aligned.",
          ],
        };

        const messages = toneMap[agent.personality] || toneMap.SAGE;
        const message = messages[Math.floor(Math.random() * messages.length)];

        await prisma.activityLog.create({
          data: {
            userId: systemUser.id,
            agentId: agent.id,
            type: "INSIGHT",
            message,
          },
        });

        console.log(`[Comms] ${agent.name}: ${message}`);
      } catch (err) {
        console.error("[Comms] Failed to generate:", err);
      }
    };

    // Generate first comm after 30 seconds, then every 5 minutes
    setTimeout(generateComms, 30000);
    setInterval(generateComms, 5 * 60 * 1000);

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
