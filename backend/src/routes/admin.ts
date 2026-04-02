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
