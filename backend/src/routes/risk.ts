import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { validateTrade, postTradeCheck, getPortfolioSnapshot, unlockAccount } from "../risk/riskEngine";

const router = Router();

// ---------------------------------------------------------------------------
// Worker endpoint — validate trade before execution (X-Worker-Auth)
// ---------------------------------------------------------------------------

const validateTradeSchema = z.object({
  userId: z.string().min(1),
  agentId: z.string().optional(),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  amount: z.number().positive(),
  price: z.number().positive(),
  quoteAmount: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  reason: z.string().optional(),
});

// POST /api/risk/validate — called by worker BEFORE every trade
router.post("/validate", async (req: Request, res: Response) => {
  // Accept both worker auth and user auth
  const workerSecret = req.headers["x-worker-auth"] as string | undefined;
  const isWorker = workerSecret === process.env.WORKER_SECRET;

  if (!isWorker) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = validateTradeSchema.parse(req.body);
    const result = await validateTrade(body);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/risk/post-trade — called by worker AFTER every trade
const postTradeSchema = z.object({
  userId: z.string().min(1),
  agentId: z.string().optional(),
  profit: z.number(),
});

router.post("/post-trade", async (req: Request, res: Response) => {
  const workerSecret = req.headers["x-worker-auth"] as string | undefined;
  const isWorker = workerSecret === process.env.WORKER_SECRET;

  if (!isWorker) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = postTradeSchema.parse(req.body);
    const decisions = await postTradeCheck(body.userId, body.agentId, body.profit);
    res.json({ decisions });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// User-facing endpoints (auth required)
// ---------------------------------------------------------------------------

router.use(authMiddleware);

// GET /api/risk/status — get user's risk status + portfolio snapshot
router.get("/status", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user, portfolio] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        maxRiskPerTrade: true,
        maxExposure: true,
        dailyLossLimit: true,
        maxDrawdown: true,
        riskLocked: true,
        riskLockedAt: true,
        riskLockedReason: true,
        peakBalance: true,
      },
    }),
    getPortfolioSnapshot(userId),
  ]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Get agents with cooldown info
  const agentCooldowns = await prisma.agent.findMany({
    where: { userId, cooldownUntil: { not: null } },
    select: {
      id: true,
      name: true,
      cooldownUntil: true,
      consecutiveLosses: true,
      status: true,
    },
  });

  res.json({
    config: {
      maxRiskPerTrade: user.maxRiskPerTrade,
      maxExposure: user.maxExposure,
      dailyLossLimit: user.dailyLossLimit,
      maxDrawdown: user.maxDrawdown,
    },
    status: {
      riskLocked: user.riskLocked,
      riskLockedAt: user.riskLockedAt,
      riskLockedReason: user.riskLockedReason,
    },
    portfolio,
    agentCooldowns,
  });
});

// PATCH /api/risk/config — update risk config
const updateConfigSchema = z.object({
  maxRiskPerTrade: z.number().min(0.005).max(0.10).optional(), // 0.5% to 10%
  maxExposure: z.number().min(0.05).max(0.50).optional(),      // 5% to 50%
  dailyLossLimit: z.number().min(-0.20).max(-0.02).optional(), // -2% to -20%
  maxDrawdown: z.number().min(-0.50).max(-0.05).optional(),    // -5% to -50%
});

router.patch("/config", async (req: Request, res: Response) => {
  try {
    const body = updateConfigSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: {
        maxRiskPerTrade: true,
        maxExposure: true,
        dailyLossLimit: true,
        maxDrawdown: true,
      },
    });
    res.json({ config: user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;
