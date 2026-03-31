import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const executeTradeSchema = z.object({
  agentId: z.string().min(1).optional(),
  pair: z.string().min(1, "Trading pair is required"),
  side: z.enum(["long", "short"]),
  entryPrice: z.number().positive("Entry price must be positive"),
  stopLoss: z.number().positive("Stop loss must be positive"),
  takeProfit: z.number().positive("Take profit must be positive"),
  positionSize: z.number().positive("Position size must be positive"),
  reason: z.string().optional(),
});

// POST /api/trades/execute — manual trade entry
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const body = executeTradeSchema.parse(req.body);

    // If agentId is provided, verify it belongs to the user
    if (body.agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: body.agentId, userId: req.user!.id },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
    }

    const sideMap = { long: "LONG", short: "SHORT" } as const;

    const trade = await prisma.trade.create({
      data: {
        userId: req.user!.id,
        agentId: body.agentId ?? null,
        symbol: body.pair,
        side: sideMap[body.side],
        amount: body.positionSize,
        price: body.entryPrice,
        stopLoss: body.stopLoss,
        takeProfit: body.takeProfit,
        status: "OPEN",
        reason: body.reason || "Manual trade",
      },
      include: {
        agent: body.agentId
          ? { select: { id: true, name: true, personality: true } }
          : false,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        agentId: body.agentId ?? null,
        type: "TRADE",
        message: `Manual ${body.side} trade opened: ${body.pair} @ ${body.entryPrice}`,
        data: {
          tradeId: trade.id,
          pair: body.pair,
          side: body.side,
          entryPrice: body.entryPrice,
          stopLoss: body.stopLoss,
          takeProfit: body.takeProfit,
          positionSize: body.positionSize,
        },
      },
    });

    res.status(201).json({ trade });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/trades
router.get("/", async (req: Request, res: Response) => {
  const { agentId, limit, offset } = req.query;

  const where: Record<string, unknown> = { userId: req.user!.id };
  if (agentId && typeof agentId === "string") {
    where.agentId = agentId;
  }

  const take = Math.min(parseInt((limit as string) || "50", 10), 100);
  const skip = parseInt((offset as string) || "0", 10);

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        agent: { select: { id: true, name: true, personality: true } },
      },
    }),
    prisma.trade.count({ where }),
  ]);

  res.json({ trades, total, limit: take, offset: skip });
});

// GET /api/trades/recent
router.get("/recent", async (req: Request, res: Response) => {
  const trades = await prisma.trade.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      agent: { select: { id: true, name: true, personality: true } },
    },
  });

  res.json({ trades });
});

export default router;
