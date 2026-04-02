import { Router, Request, Response } from "express";
import ccxt from "ccxt";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const SUPPORTED_EXCHANGES: Record<string, string> = {
  bybit: "bybit",
  binance: "binance",
  okx: "okx",
  kucoin: "kucoin",
};

async function getExchangeBalance(
  exchangeName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ totalUsd: number; balances: { asset: string; free: number; total: number }[] }> {
  const ccxtId = SUPPORTED_EXCHANGES[exchangeName.toLowerCase()];
  if (!ccxtId) return { totalUsd: 0, balances: [] };

  try {
    const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
    if (!ExchangeClass) return { totalUsd: 0, balances: [] };

    const exchange = new ExchangeClass({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      timeout: 15000,
    });

    const bal = await exchange.fetchBalance();
    const balances: { asset: string; free: number; total: number; usdValue?: number }[] = [];
    let totalUsd = 0;

    // Collect non-zero balances
    const nonZeroAssets: { asset: string; free: number; total: number }[] = [];
    for (const [asset, amount] of Object.entries(bal.total || {})) {
      const val = amount as number;
      if (val > 0) {
        const free = (bal.free?.[asset] as number) || 0;
        nonZeroAssets.push({ asset, free, total: val });
      }
    }

    // Fetch USD prices for crypto assets
    for (const item of nonZeroAssets) {
      const stables = ["USDT", "USDC", "USD", "BUSD", "DAI", "TUSD"];
      if (stables.includes(item.asset)) {
        balances.push({ ...item, usdValue: item.total });
        totalUsd += item.total;
      } else {
        try {
          const ticker = await exchange.fetchTicker(`${item.asset}/USDT`);
          const price = ticker?.last || 0;
          const usdValue = item.total * price;
          balances.push({ ...item, usdValue });
          totalUsd += usdValue;
        } catch {
          // No USDT pair — try USD
          try {
            const ticker = await exchange.fetchTicker(`${item.asset}/USD`);
            const price = ticker?.last || 0;
            const usdValue = item.total * price;
            balances.push({ ...item, usdValue });
            totalUsd += usdValue;
          } catch {
            // Can't price this asset — add without USD value
            balances.push({ ...item, usdValue: 0 });
          }
        }
      }
    }

    // Sort by USD value descending
    balances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

    return { totalUsd: Math.round(totalUsd * 100) / 100, balances };
  } catch {
    return { totalUsd: 0, balances: [] };
  }
}

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get("/stats", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [profitAgg, activeAgentCount, totalTrades, recentActivity, exchangeRecord] =
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
      prisma.exchange.findFirst({
        where: { userId, connected: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const realProfit = profitAgg._sum.profit ?? 0;

  let totalBalance = 10000 + realProfit; // Demo default
  let exchangeConnected = false;
  let exchangeBalances: { asset: string; free: number; total: number }[] = [];

  // If user has a connected exchange, fetch real balance
  if (exchangeRecord) {
    exchangeConnected = true;
    const exBalance = await getExchangeBalance(
      exchangeRecord.name,
      exchangeRecord.apiKey,
      exchangeRecord.apiSecret
    );
    if (exBalance.totalUsd > 0) {
      totalBalance = exBalance.totalUsd;
    }
    exchangeBalances = exBalance.balances;
  }

  res.json({
    stats: {
      totalBalance,
      totalProfit: realProfit,
      activeAgents: activeAgentCount,
      totalTrades,
    },
    exchangeConnected,
    exchangeBalances,
    recentActivity,
  });
});

export default router;
