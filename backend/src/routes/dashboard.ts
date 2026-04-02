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

    // Load markets first so ticker calls work
    await exchange.loadMarkets();

    const bal = await exchange.fetchBalance();
    const balances: { asset: string; free: number; total: number; usdValue?: number }[] = [];
    let totalUsd = 0;
    const stables = ["USDT", "USDC", "USD", "BUSD", "DAI", "TUSD"];

    // Collect non-zero balances
    const nonZeroAssets: { asset: string; free: number; total: number }[] = [];
    for (const [asset, amount] of Object.entries(bal.total || {})) {
      const val = amount as number;
      if (val > 0) {
        const free = (bal.free?.[asset] as number) || 0;
        nonZeroAssets.push({ asset, free, total: val });
      }
    }

    // Fetch all tickers at once for efficiency
    let tickers: Record<string, any> = {};
    try {
      tickers = await exchange.fetchTickers();
    } catch {
      // Fallback: fetch individually below
    }

    for (const item of nonZeroAssets) {
      if (stables.includes(item.asset)) {
        balances.push({ ...item, usdValue: item.total });
        totalUsd += item.total;
      } else {
        const pair = `${item.asset}/USDT`;
        let price = tickers[pair]?.last || 0;

        // If bulk fetch didn't have it, try individual
        if (!price) {
          try {
            const ticker = await exchange.fetchTicker(pair);
            price = ticker?.last || 0;
          } catch {
            // Skip this asset's USD value
          }
        }

        const usdValue = item.total * price;
        balances.push({ ...item, usdValue });
        totalUsd += usdValue;
      }
    }

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

  let totalBalance = 0;
  let exchangeConnected = false;
  let exchangeBalances: { asset: string; free: number; total: number }[] = [];

  if (exchangeRecord) {
    exchangeConnected = true;
    const exBalance = await getExchangeBalance(
      exchangeRecord.name,
      exchangeRecord.apiKey,
      exchangeRecord.apiSecret
    );
    totalBalance = exBalance.totalUsd;
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

// GET /api/dashboard/points — real points data
router.get("/points", async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user, agentCount, tradeCount, profitableTrades, exchangeCount, referralCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { foundingPoints: true, createdAt: true } }),
    prisma.agent.count({ where: { userId } }),
    prisma.trade.count({ where: { userId } }),
    prisma.trade.count({ where: { userId, profit: { gt: 0 } } }),
    prisma.exchange.count({ where: { userId } }),
    prisma.user.count({ where: { referredBy: userId } }),
  ]);

  const foundingPoints = user?.foundingPoints || 0;

  // Calculate earned points from real activity
  const agentPoints = agentCount * 100;       // +100 per agent deployed
  const tradePoints = profitableTrades * 10;   // +10 per profitable trade
  const exchangePoints = exchangeCount > 0 ? 50 : 0; // +50 for connecting exchange
  const referralPoints = referralCount * 500;  // +500 per referral

  // Days since account creation (daily login approximation)
  const daysSinceCreation = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const loginPoints = Math.min(daysSinceCreation, 30) * 25; // +25/day, max 30 days

  const totalEarned = agentPoints + tradePoints + exchangePoints + loginPoints + referralPoints;
  const totalPoints = foundingPoints + totalEarned;

  res.json({
    totalPoints,
    foundingPoints,
    totalEarned,
    breakdown: {
      agents: { count: agentCount, points: agentPoints },
      trades: { count: profitableTrades, total: tradeCount, points: tradePoints },
      exchange: { connected: exchangeCount > 0, points: exchangePoints },
      logins: { days: Math.min(daysSinceCreation, 30), points: loginPoints },
      referrals: { count: referralCount, points: referralPoints },
    },
    accountAge: daysSinceCreation,
  });
});

// GET /api/dashboard/referrals
router.get("/referrals", async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const referrals = await prisma.user.findMany({
    where: { referredBy: userId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ referrals, total: referrals.length });
});

export default router;
