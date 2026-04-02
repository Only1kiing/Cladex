import { Router, Request, Response } from "express";
import { z } from "zod";
import ccxt from "ccxt";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const SUPPORTED_EXCHANGES: Record<string, string> = {
  bybit: "bybit",
  binance: "binance",
  okx: "okx",
  kucoin: "kucoin",
};

async function getExchangeInstance(userId: string) {
  const exchangeRecord = await prisma.exchange.findFirst({
    where: { userId, connected: true },
    orderBy: { createdAt: "desc" },
  });

  if (!exchangeRecord) return null;

  const ccxtId = SUPPORTED_EXCHANGES[exchangeRecord.name.toLowerCase()];
  if (!ccxtId) return null;

  const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
  if (!ExchangeClass) return null;

  const exchange = new ExchangeClass({
    apiKey: exchangeRecord.apiKey,
    secret: exchangeRecord.apiSecret,
    enableRateLimit: true,
    timeout: 15000,
  });

  await exchange.loadMarkets();
  return { exchange, name: exchangeRecord.name };
}

const router = Router();
router.use(authMiddleware);

const executeTradeSchema = z.object({
  agentId: z.string().min(1).optional(),
  symbol: z.string().min(1, "Trading pair is required (e.g. BTC/USDT)"),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive().optional(),
  usdAmount: z.number().positive().optional(), // auto-calculate crypto amount from USD
  type: z.enum(["market", "limit"]).default("market"),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  reason: z.string().optional(),
});

// POST /api/trades/execute — execute a real trade on the exchange
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const body = executeTradeSchema.parse(req.body);

    // Verify agent belongs to user if provided
    if (body.agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: body.agentId, userId: req.user!.id },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
    }

    // Check gas balance
    const GAS_FEE = 0.50; // $0.50 per trade
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { gasBalance: true } });
    if (!user || user.gasBalance < GAS_FEE) {
      res.status(400).json({ error: `Insufficient gas balance ($${user?.gasBalance?.toFixed(2) || '0.00'}). You need at least $${GAS_FEE} gas to execute a trade. Top up in Settings.` });
      return;
    }

    // Get user's exchange connection
    const exchangeData = await getExchangeInstance(req.user!.id);
    if (!exchangeData) {
      res.status(400).json({ error: "No exchange connected. Go to Settings to connect your exchange." });
      return;
    }

    const { exchange, name: exchangeName } = exchangeData;

    // Calculate amount
    let tradeAmount = body.amount || 0;

    if (!tradeAmount && body.usdAmount) {
      // Convert USD to crypto amount using live price
      try {
        const ticker = await exchange.fetchTicker(body.symbol);
        const price = ticker?.last || 0;
        if (price > 0) {
          tradeAmount = Math.floor((body.usdAmount / price) * 100000000) / 100000000; // 8 decimal precision
        }
      } catch {
        res.status(400).json({ error: "Could not fetch price to calculate trade amount" });
        return;
      }
    }

    if (tradeAmount <= 0) {
      res.status(400).json({ error: "Trade amount is too small" });
      return;
    }

    // Place the order on the real exchange
    let order;
    try {
      if (body.type === "limit" && body.price) {
        order = await exchange.createOrder(body.symbol, "limit", body.side, tradeAmount, body.price);
      } else {
        order = await exchange.createOrder(body.symbol, "market", body.side, tradeAmount);
      }
    } catch (err: any) {
      const msg = err?.message || "Order failed";
      res.status(400).json({ error: `Exchange error: ${msg}` });
      return;
    }

    const executedPrice = order.average || order.price || body.price || 0;
    const sideMap: Record<string, "BUY" | "SELL"> = { buy: "BUY", sell: "SELL" };

    // Save trade to database
    const trade = await prisma.trade.create({
      data: {
        userId: req.user!.id,
        agentId: body.agentId ?? null,
        symbol: body.symbol,
        side: sideMap[body.side] || "BUY",
        amount: tradeAmount,
        price: executedPrice,
        stopLoss: body.stopLoss ?? null,
        takeProfit: body.takeProfit ?? null,
        status: "OPEN",
        reason: body.reason || `${body.type} ${body.side} via ${exchangeName}`,
      },
      include: {
        agent: body.agentId
          ? { select: { id: true, name: true, personality: true } }
          : false,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        agentId: body.agentId ?? null,
        type: "TRADE",
        message: `${body.side.toUpperCase()} ${body.amount} ${body.symbol} @ $${executedPrice.toLocaleString()} on ${exchangeName}`,
        data: {
          tradeId: trade.id,
          orderId: order.id,
          symbol: body.symbol,
          side: body.side,
          amount: body.amount,
          price: executedPrice,
          type: body.type,
          exchange: exchangeName,
        },
      },
    });

    // Deduct gas fee
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { gasBalance: { decrement: GAS_FEE } },
    });

    res.status(201).json({
      trade,
      gasFee: GAS_FEE,
      order: {
        id: order.id,
        status: order.status,
        filled: order.filled,
        average: order.average,
        cost: order.cost,
        exchange: exchangeName,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/trades/price/:symbol — get current price for a trading pair
router.get("/price/:symbol", async (req: Request, res: Response) => {
  const symbol = (req.params.symbol as string).replace("-", "/");

  const exchangeData = await getExchangeInstance(req.user!.id);
  if (!exchangeData) {
    res.status(400).json({ error: "No exchange connected" });
    return;
  }

  try {
    const ticker = await exchangeData.exchange.fetchTicker(symbol);
    res.json({
      symbol,
      price: ticker.last,
      bid: ticker.bid,
      ask: ticker.ask,
      high: ticker.high,
      low: ticker.low,
      volume: ticker.baseVolume,
      change: ticker.percentage,
      exchange: exchangeData.name,
    });
  } catch (err: any) {
    res.status(400).json({ error: `Failed to fetch price: ${err?.message}` });
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

// GET /api/trades/signals — get active signals from team agents
router.get("/signals", async (_req: Request, res: Response) => {
  const signals = await prisma.signal.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      agent: { select: { id: true, name: true, personality: true } },
    },
  });

  res.json({ signals });
});

export default router;
