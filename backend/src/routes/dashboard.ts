import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get("/stats", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [profitAgg, activeAgentCount, totalTrades, recentActivity] =
    await Promise.all([
      prisma.trade.aggregate({
        where: { userId },
        _sum: { profit: true },
      }),
      prisma.agent.count({
        where: { userId, status: "RUNNING" },
      }),
      prisma.trade.count({
        where: { userId },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          agent: { select: { id: true, name: true } },
        },
      }),
    ]);

  const realProfit = profitAgg._sum.profit ?? 0;

  // Mock starting balance for demo; in production this would come from
  // exchange portfolio sync.
  const mockStartingBalance = 10000;

  res.json({
    stats: {
      totalBalance: mockStartingBalance + realProfit,
      totalProfit: realProfit,
      activeAgents: activeAgentCount,
      totalTrades,
    },
    recentActivity,
  });
});

export default router;
