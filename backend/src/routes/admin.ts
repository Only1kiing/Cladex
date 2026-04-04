import { Router, Request, Response, NextFunction } from "express";
import ccxt from "ccxt";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ---------------------------------------------------------------------------
// Admin authorization middleware
// Requires the user to be authenticated (JWT) AND have role === "admin".
// This replaces the old shared-secret approach which allowed any caller with
// the secret to access admin routes regardless of user identity.
// ---------------------------------------------------------------------------
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Double-check role from the database to prevent stale JWT data
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// Super-admin authorization middleware
// Only users with role === "super_admin" may pass. Used for role-management
// endpoints that could otherwise be used to escalate privileges.
// ---------------------------------------------------------------------------
async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: super_admin access required" });
    return;
  }

  next();
}

// All admin routes require JWT authentication first, then admin role check
router.use(authMiddleware);
router.use(requireAdmin);

// GET /api/admin/users — list all users
router.get("/users", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { agents: true, trades: true, paymentReceipts: true } },
    },
  });

  res.json({ users, total: users.length });
});

// POST /api/admin/users/:id/role — change a user's role (super_admin only).
// Body: { role: "user" | "admin" | "super_admin" }. Cannot demote yourself.
router.post("/users/:id/role", requireSuperAdmin, async (req: Request, res: Response) => {
  const targetId = req.params.id as string;
  const { role } = req.body as { role?: string };

  const allowed = ["user", "admin", "super_admin"] as const;
  if (!role || !allowed.includes(role as (typeof allowed)[number])) {
    res.status(400).json({ error: "role must be one of: user, admin, super_admin" });
    return;
  }

  if (req.user && req.user.id === targetId && role !== "super_admin") {
    res.status(400).json({ error: "You cannot demote yourself" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  res.json({ user: updated });
});

// GET /api/admin/stats — platform-wide stats
router.get("/stats", async (_req: Request, res: Response) => {
  const [totalUsers, totalAgents, totalTrades, adminsCount, volumeAgg] = await Promise.all([
    prisma.user.count(),
    prisma.agent.count(),
    prisma.trade.count(),
    prisma.user.count({ where: { role: { in: ["admin", "super_admin"] } } }),
    prisma.trade.aggregate({ _sum: { amount: true } }),
  ]);

  res.json({
    totalUsers,
    totalAgents,
    totalTrades,
    totalVolume: volumeAgg._sum.amount || 0,
    admins: adminsCount,
  });
});

// GET /api/admin/signals — last 50 signals (active + expired)
router.get("/signals", async (_req: Request, res: Response) => {
  const signals = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      agent: { select: { id: true, name: true, personality: true } },
    },
  });
  res.json({ signals, total: signals.length });
});

// POST /api/admin/signals/:id/expire — force-expire a signal
router.post("/signals/:id/expire", async (req: Request, res: Response) => {
  const signalId = req.params.id as string;

  const signal = await prisma.signal.findUnique({ where: { id: signalId } });
  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  const updated = await prisma.signal.update({
    where: { id: signalId },
    data: { status: "expired" },
  });

  res.json({ signal: updated });
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
  // Find or create a system user for Cladex team agents.
  // NOTE: system@cladex.xyz is designated as a built-in admin account.
  let systemUser = await prisma.user.findUnique({ where: { email: "system@cladex.xyz" } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "system@cladex.xyz",
        password: "not-a-real-login",
        name: "Cladex Team",
        role: "admin",
      },
    });
  } else if (systemUser.role !== "admin") {
    // Ensure the system user always has admin role
    systemUser = await prisma.user.update({
      where: { id: systemUser.id },
      data: { role: "admin" },
    });
  }

  const teamAgents = [
    { name: "Raze", personality: "APEX" as const, riskLevel: "HIGH" as const, assets: ["SOL", "AVAX", "LINK"], strategy: { description: "Aggressive momentum hunter. Chases breakouts and rides volatility." } },
    { name: "Knox", personality: "NOVA" as const, riskLevel: "LOW" as const, assets: ["SOL", "LINK", "ETH"], strategy: { description: "Capital guardian. Protects portfolios and minimizes drawdown." } },
    { name: "Iris", personality: "ECHO" as const, riskLevel: "MEDIUM" as const, assets: ["SOL", "LINK", "AVAX"], strategy: { description: "Predictive analyst. Uses pattern recognition and cycle theory." } },
    { name: "Byte", personality: "SAGE" as const, riskLevel: "MEDIUM" as const, assets: ["LINK", "AVAX", "SOL"], strategy: { description: "Data-driven strategist. Multi-indicator technical analysis." } },
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

  // Update existing agents' assets to include cheaper coins
  for (const a of teamAgents) {
    await prisma.agent.updateMany({
      where: { name: a.name, userId: systemUser.id },
      data: { assets: a.assets },
    });
  }

  res.json({ message: `Created ${created.length} team agents, all assets updated`, created });
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

// POST /api/admin/generate-signal — force generate an AI signal
router.post("/generate-signal", async (_req: Request, res: Response) => {
  try {
    const { generateSignals, expireSignals } = await import("../services/signal.service");
    await expireSignals();

    const runningAgents = await prisma.agent.count({ where: { status: "RUNNING" } });
    const activeSignals = await prisma.signal.count({ where: { status: "active" } });

    const count = await generateSignals({ force: true });

    res.json({
      generated: count,
      debug: { runningAgents, activeSignalsBefore: activeSignals, forced: true },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Signal generation failed" });
  }
});

// POST /api/admin/gas/:userId — credit gas to a user
router.post("/gas/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const { amount } = req.body;
  if (!amount || typeof amount !== "number") {
    res.status(400).json({ error: "Amount required" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { gasBalance: { increment: amount } },
    select: { email: true, gasBalance: true },
  });
  res.json({ message: `Credited $${amount} gas to ${user.email}`, gasBalance: user.gasBalance });
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

// POST /api/admin/risk/unlock/:userId — unlock a risk-locked account
router.post("/risk/unlock/:userId", async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const { unlockAccount } = await import("../risk/riskEngine");
  await unlockAccount(userId);
  res.json({ message: `Account ${userId} unlocked` });
});

export default router;
