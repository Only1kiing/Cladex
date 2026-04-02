import { Router, Request, Response } from "express";
import ccxt from "ccxt";
import prisma from "../lib/prisma";

const router = Router();

// Simple admin auth using a shared secret
function adminAuth(req: Request, res: Response, next: Function) {
  const adminSecret = process.env.ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"] as string;

  if (!adminSecret || provided !== adminSecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

router.use(adminAuth);

// GET /api/admin/users — list all users
router.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { agents: true, trades: true, paymentReceipts: true } },
    },
  });

  res.json({ users, total: users.length });
});

// GET /api/admin/receipts — list all payment receipts
router.get("/receipts", async (_req: Request, res: Response) => {
  const receipts = await prisma.paymentReceipt.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  res.json({ receipts, total: receipts.length });
});

// PATCH /api/admin/receipts/:id — approve or reject a receipt
router.patch("/receipts/:id", async (req: Request, res: Response) => {
  const receiptId = req.params.id as string;
  const { status } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    return;
  }

  const receipt = await prisma.paymentReceipt.update({
    where: { id: receiptId },
    data: { status },
  });

  res.json({ receipt });
});

// DELETE /api/admin/users/:id — delete a user
router.delete("/users/:id", async (req: Request, res: Response) => {
  const userId = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json({ message: `User ${user.email} deleted` });
});

// DELETE /api/admin/agents/:userId — delete all agents for a user
router.delete("/agents/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const deleted = await prisma.agent.deleteMany({ where: { userId } });
  res.json({ message: `Deleted ${deleted.count} agents for user ${userId}` });
});

// POST /api/admin/seed-agents — create official Cladex team agents
router.post("/seed-agents", async (req: Request, res: Response) => {
  // Find or create a system user for Cladex team agents
  let systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "system@cladex.xyz",
        password: "not-a-real-login",
        name: "Cladex Team",
      },
    });
  }

  const teamAgents = [
    { name: "Raze", personality: "APEX" as const, riskLevel: "HIGH" as const, assets: ["SOL", "AVAX", "LINK"], strategy: { description: "Aggressive momentum hunter. Chases breakouts and rides volatility." } },
    { name: "Knox", personality: "NOVA" as const, riskLevel: "LOW" as const, assets: ["BTC", "ETH"], strategy: { description: "Capital guardian. Protects portfolios and minimizes drawdown." } },
    { name: "Iris", personality: "ECHO" as const, riskLevel: "MEDIUM" as const, assets: ["BTC", "ETH", "SOL"], strategy: { description: "Predictive analyst. Uses pattern recognition and cycle theory." } },
    { name: "Byte", personality: "SAGE" as const, riskLevel: "MEDIUM" as const, assets: ["BTC", "ETH", "LINK", "ARB"], strategy: { description: "Data-driven strategist. Multi-indicator technical analysis." } },
  ];

  const created = [];
  for (const a of teamAgents) {
    const existing = await prisma.agent.findFirst({ where: { name: a.name, userId: systemUser.id } });
    if (!existing) {
      const agent = await prisma.agent.create({
        data: {
          userId: systemUser.id,
          name: a.name,
          personality: a.personality,
          riskLevel: a.riskLevel,
          assets: a.assets,
          strategy: a.strategy,
          status: "RUNNING",
        },
      });
      created.push(agent.name);
    }
  }

  res.json({ message: `Created ${created.length} team agents`, created });
});

// POST /api/admin/generate-comms — generate AI comms from team agents
router.post("/generate-comms", async (req: Request, res: Response) => {
  const systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
  if (!systemUser) {
    res.status(400).json({ error: "Run seed-agents first" });
    return;
  }

  const agents = await prisma.agent.findMany({
    where: { userId: systemUser.id, status: "RUNNING" },
  });

  if (agents.length === 0) {
    res.status(400).json({ error: "No team agents found" });
    return;
  }

  // Generate a message for each agent
  const messages: { agent: string; message: string }[] = [];
  for (const agent of agents) {
    const toneMap: Record<string, string[]> = {
      APEX: [
        "SOL looking primed for a breakout above resistance. Watching the 4H chart closely.",
        "Volume spike on AVAX — momentum is building. Entry zone identified.",
        "Liquidation cascade forming on BTC shorts. This could get spicy.",
        "LINK breaking out of a 2-week range. Scaling in now.",
        "High conviction setup on SOL. Risk/reward is 1:4. Let's go.",
      ],
      NOVA: [
        "All positions within risk parameters. Portfolio drawdown at 0.3%.",
        "BTC holding support at key level. No action needed — patience pays.",
        "Tightened stop-losses across the board. Capital preservation first.",
        "ETH volatility decreasing. Good sign for our long positions.",
        "Risk check complete. All systems green. Your capital is safe.",
      ],
      ECHO: [
        "Pattern recognition: BTC forming same structure as Q3 2024 before the rally.",
        "My models show 78% probability of upward move in the next 48 hours.",
        "Cycle analysis: we're entering the accumulation phase. Smart money is loading.",
        "Cross-referencing whale wallet data with price action. Convergence detected.",
        "Historical pattern match found. Last time this happened, ETH moved +15% in a week.",
      ],
      SAGE: [
        "RSI divergence on BTC 4H chart. Bullish signal confirmed by volume.",
        "On-chain metrics: exchange outflows increasing. Supply squeeze forming.",
        "Multi-timeframe analysis complete. 3 pairs showing positive expected value.",
        "Correlation matrix updated. SOL decorrelating from BTC — potential alpha.",
        "Funding rates negative across major pairs. Contrarian long setup emerging.",
      ],
    };

    const possibleMessages = toneMap[agent.personality] || toneMap.SAGE;
    const message = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];

    await prisma.activityLog.create({
      data: {
        userId: systemUser.id,
        agentId: agent.id,
        type: "INSIGHT",
        message,
      },
    });

    messages.push({ agent: agent.name, message });
  }

  res.json({ generated: messages.length, messages });
});

// GET /api/admin/exchange/:userId — check user's exchange connection and balance
router.get("/exchange/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const exchangeRecord = await prisma.exchange.findFirst({
    where: { userId, connected: true },
    orderBy: { createdAt: "desc" },
  });

  if (!exchangeRecord) {
    res.json({ connected: false, message: "No exchange connected for this user" });
    return;
  }

  const SUPPORTED: Record<string, string> = { bybit: "bybit", binance: "binance", okx: "okx", kucoin: "kucoin" };
  const ccxtId = SUPPORTED[exchangeRecord.name.toLowerCase()];

  if (!ccxtId) {
    res.json({ connected: true, exchange: exchangeRecord.name, message: "Unsupported exchange for balance check" });
    return;
  }

  try {
    const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
    const exchange = new ExchangeClass({
      apiKey: exchangeRecord.apiKey,
      secret: exchangeRecord.apiSecret,
      enableRateLimit: true,
      timeout: 15000,
    });

    await exchange.loadMarkets();
    const bal = await exchange.fetchBalance();

    const balances: { asset: string; amount: number; usdValue: number }[] = [];
    let totalUsd = 0;
    const stables = ["USDT", "USDC", "USD", "BUSD"];

    for (const [asset, amount] of Object.entries(bal.total || {})) {
      const val = amount as number;
      if (val > 0) {
        if (stables.includes(asset)) {
          balances.push({ asset, amount: val, usdValue: val });
          totalUsd += val;
        } else {
          try {
            const ticker = await exchange.fetchTicker(`${asset}/USDT`);
            const usdValue = val * (ticker?.last || 0);
            balances.push({ asset, amount: val, usdValue: Math.round(usdValue * 100) / 100 });
            totalUsd += usdValue;
          } catch {
            balances.push({ asset, amount: val, usdValue: 0 });
          }
        }
      }
    }

    res.json({
      connected: true,
      exchange: exchangeRecord.name,
      totalUsd: Math.round(totalUsd * 100) / 100,
      balances: balances.sort((a, b) => b.usdValue - a.usdValue),
    });
  } catch (err: any) {
    res.json({ connected: true, exchange: exchangeRecord.name, error: err?.message || "Failed to fetch balance" });
  }
});

export default router;
