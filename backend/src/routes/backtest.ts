import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { runBacktest } from "../backtest/backtestEngine";
import { isValidTimeframe } from "../backtest/dataLoader";
import { STRATEGIES } from "../backtest/strategies";

const router = Router();
router.use(authMiddleware);

const backtestSchema = z.object({
  strategy: z.string().min(1),
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startingBalance: z.number().positive().max(10_000_000),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  exchange: z.string().optional(),
  positionSizePercent: z.number().min(0.5).max(10).optional(),
  maxExposurePercent: z.number().min(5).max(50).optional(),
  feePercent: z.number().min(0).max(1).optional(),
  slippagePercent: z.number().min(0).max(1).optional(),
});

// POST /api/backtest/run
router.post("/run", async (req: Request, res: Response) => {
  try {
    const body = backtestSchema.parse(req.body);

    // Validate strategy
    if (!STRATEGIES[body.strategy.toLowerCase()]) {
      res.status(400).json({
        error: `Unknown strategy: ${body.strategy}`,
        available: Object.keys(STRATEGIES),
      });
      return;
    }

    // Validate timeframe
    if (!isValidTimeframe(body.timeframe)) {
      res.status(400).json({
        error: `Invalid timeframe: ${body.timeframe}`,
        available: ["1m", "5m", "15m", "1h", "4h", "1d"],
      });
      return;
    }

    // Validate dates
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: "Invalid date format. Use ISO 8601 (e.g. 2025-01-01)" });
      return;
    }
    if (start >= end) {
      res.status(400).json({ error: "startDate must be before endDate" });
      return;
    }

    // Validate symbol format
    if (!body.symbol.includes("/")) {
      res.status(400).json({ error: "Symbol must be in BASE/QUOTE format (e.g. BTC/USDT)" });
      return;
    }

    const result = await runBacktest({
      strategy: body.strategy.toLowerCase(),
      symbol: body.symbol,
      timeframe: body.timeframe as any,
      startDate: body.startDate,
      endDate: body.endDate,
      startingBalance: body.startingBalance,
      riskLevel: body.riskLevel,
      exchange: body.exchange,
      positionSizePercent: body.positionSizePercent,
      maxExposurePercent: body.maxExposurePercent,
      feePercent: body.feePercent,
      slippagePercent: body.slippagePercent,
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    // ccxt / data errors
    const msg = err?.message || "Backtest failed";
    console.error("[Backtest] Error:", msg);
    res.status(400).json({ error: msg });
  }
});

// GET /api/backtest/strategies — list available strategies
router.get("/strategies", (_req: Request, res: Response) => {
  const strategies = [
    {
      id: "safeflow",
      name: "SafeFlow",
      description: "Capital preservation — buys dips in confirmed uptrends using RSI + MA + volatility filter",
      riskLevel: "LOW",
      personality: "NOVA",
    },
    {
      id: "trend_pro",
      name: "TrendPro",
      description: "Momentum trading — rides strong trends using EMA crossover + volume confirmation + breakout",
      riskLevel: "MEDIUM",
      personality: "SAGE",
    },
    {
      id: "beast_mode",
      name: "Beast Mode X",
      description: "Breakout hunter — detects compression + volume accumulation + explosive breakouts",
      riskLevel: "HIGH",
      personality: "APEX",
    },
    {
      id: "dca",
      name: "DCA",
      description: "Dollar-cost averaging — periodic buys at fixed intervals regardless of price",
      riskLevel: "LOW",
      personality: "ANY",
    },
  ];

  res.json({ strategies });
});

export default router;
