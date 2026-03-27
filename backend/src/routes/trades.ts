import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

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
