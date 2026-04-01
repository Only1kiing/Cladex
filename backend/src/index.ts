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
});

export default app;
