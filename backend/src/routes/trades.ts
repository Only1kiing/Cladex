import { Router, Request, Response } from "express";
import { z } from "zod";
import ccxt from "ccxt";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { validateTrade, postTradeCheck } from "../risk/riskEngine";

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

// POST /api/trades/report — worker reports executed trades (X-Worker-Auth)
const reportTradeSchema = z.object({
  agentId: z.string().min(1),
  symbol: z.string().min(1),
  action: z.string().min(1),         // BUY or SELL
  amount: z.number().positive(),
  price: z.number().positive(),
  status: z.string().min(1),          // simulated, executed, error
  reason: z.string().optional(),
  orderId: z.string().optional(),
  mode: z.string().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  riskPercent: z.number().optional(),
  takeProfitLevels: z.array(z.any()).optional(),
  profit: z.number().optional(),
});

router.post("/report", async (req: Request, res: Response) => {
  const workerSecret = req.headers["x-worker-auth"] as string | undefined;
  if (!workerSecret || workerSecret !== process.env.WORKER_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = reportTradeSchema.parse(req.body);

    // Look up agent to get userId
    const agent = await prisma.agent.findUnique({
      where: { id: body.agentId },
      select: { userId: true, totalTrades: true, profit: true },
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const sideMap: Record<string, "BUY" | "SELL"> = { BUY: "BUY", SELL: "SELL", buy: "BUY", sell: "SELL" };
    const tradeSide = sideMap[body.action] || "BUY";

    // Save trade
    const trade = await prisma.trade.create({
      data: {
        userId: agent.userId,
        agentId: body.agentId,
        symbol: body.symbol,
        side: tradeSide,
        amount: body.amount,
        price: body.price,
        profit: body.profit || 0,
        stopLoss: body.stopLoss ?? null,
        takeProfit: body.takeProfit ?? null,
        takeProfitLevels: body.takeProfitLevels ? body.takeProfitLevels as any : undefined,
        riskPercent: body.riskPercent ?? null,
        status: body.status === "error" ? "CANCELLED" : "OPEN",
        reason: body.reason || `${body.action} via worker (${body.mode || "paper"})`,
      },
    });

    // Update agent stats
    await prisma.agent.update({
      where: { id: body.agentId },
      data: {
        totalTrades: { increment: 1 },
        profit: { increment: body.profit || 0 },
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
  marketType: z.enum(["spot", "futures"]).default("spot"),
  leverage: z.number().int().min(1).max(100).optional(),
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
    let livePrice = body.price || 0;

    if (!tradeAmount && body.usdAmount) {
      // Convert USD to crypto amount using live price
      try {
        const ticker = await exchange.fetchTicker(body.symbol);
        livePrice = ticker?.last || 0;
        if (livePrice > 0) {
          tradeAmount = Math.floor((body.usdAmount / livePrice) * 100000000) / 100000000; // 8 decimal precision
        }
      } catch {
        res.status(400).json({ error: "Could not fetch price to calculate trade amount" });
        return;
      }
    }

    if (!livePrice) {
      try {
        const ticker = await exchange.fetchTicker(body.symbol);
        livePrice = ticker?.last || 0;
      } catch { /* use body.price fallback */ }
    }

    if (tradeAmount <= 0) {
      res.status(400).json({ error: "Trade amount is too small" });
      return;
    }

    // ---- RISK ENGINE: pre-trade validation ----
    const sideMap: Record<string, "BUY" | "SELL"> = { buy: "BUY", sell: "SELL" };
    const riskCheck = await validateTrade({
      userId: req.user!.id,
      agentId: body.agentId,
      symbol: body.symbol,
      side: sideMap[body.side] || "BUY",
      amount: tradeAmount,
      price: livePrice || tradeAmount, // fallback
      quoteAmount: body.usdAmount,
      stopLoss: body.stopLoss,
      takeProfit: body.takeProfit,
      reason: body.reason,
    });

    if (!riskCheck.allowed) {
      res.status(403).json({
        error: riskCheck.reason || "Trade blocked by risk engine",
        riskBlocked: true,
      });
      return;
    }

    // Apply risk engine adjustments
    if (riskCheck.adjustedAmount && riskCheck.adjustedAmount !== tradeAmount) {
      tradeAmount = riskCheck.adjustedAmount;
    }

    const effectiveStopLoss = riskCheck.adjustedStopLoss ?? body.stopLoss ?? null;
    const effectiveTakeProfit = body.takeProfit ?? riskCheck.takeProfitLevels?.[1]?.targetPrice ?? null;
    // ---- END RISK ENGINE ----

    // Resolve trading symbol — futures use linear contract (e.g. AVAX/USDT:USDT)
    let tradingSymbol = body.symbol;
    if (body.marketType === "futures") {
      // Convert spot symbol to linear perpetual contract
      // AVAX/USDT → AVAX/USDT:USDT
      if (!tradingSymbol.includes(":")) {
        const quote = tradingSymbol.split("/")[1] || "USDT";
        tradingSymbol = `${tradingSymbol}:${quote}`;
      }
      // Set leverage before placing the order
      try {
        await exchange.setLeverage(body.leverage || 5, tradingSymbol);
      } catch (leverageErr: any) {
        // Some exchanges silently accept leverage, some throw if already set — continue
        console.log(`Leverage set attempt: ${leverageErr?.message || 'ok'}`);
      }
    }

    // Place the order on the real exchange
    let order;
    try {
      if (body.type === "limit" && body.price) {
        order = await exchange.createOrder(tradingSymbol, "limit", body.side, tradeAmount, body.price);
      } else {
        order = await exchange.createOrder(tradingSymbol, "market", body.side, tradeAmount);
      }
    } catch (err: any) {
      const msg = err?.message || "Order failed";
      res.status(400).json({ error: `Exchange error: ${msg}` });
      return;
    }

    // Get the actual fill price — market orders on Bybit often don't return
    // price immediately, so we try multiple sources
    let executedPrice = order.average || order.price || 0;

    // If no fill price from order response, fetch the order status
    if (!executedPrice && order.id) {
      try {
        const fetched = await exchange.fetchOrder(order.id, tradingSymbol);
        executedPrice = fetched.average || fetched.price || 0;
      } catch { /* fallback below */ }
    }

    // Last resort: use the live ticker price
    if (!executedPrice) {
      executedPrice = livePrice || body.price || 0;
    }

    // If we STILL don't have a price, fetch ticker now
    if (!executedPrice) {
      try {
        const ticker = await exchange.fetchTicker(body.symbol);
        executedPrice = ticker?.last || 0;
      } catch { /* give up */ }
    }

    // Save trade to database
    const trade = await prisma.trade.create({
      data: {
        userId: req.user!.id,
        agentId: body.agentId ?? null,
        symbol: body.symbol,
        side: sideMap[body.side] || "BUY",
        amount: tradeAmount,
        price: executedPrice,
        stopLoss: effectiveStopLoss,
        takeProfit: effectiveTakeProfit,
        takeProfitLevels: riskCheck.takeProfitLevels ? riskCheck.takeProfitLevels as any : undefined,
        riskPercent: riskCheck.riskPercent ?? null,
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

    // ---- RISK ENGINE: post-trade check ----
    // For new trades, profit is 0 at open. The real profit check matters
    // on trade close. For now, track that a trade was opened successfully.
    // Negative cost (slippage) is treated as initial loss signal.
    const slippage = body.price && executedPrice
      ? (body.side === "buy"
          ? (executedPrice - body.price) / body.price   // paid more = negative
          : (body.price - executedPrice) / body.price)  // got less = negative
      : 0;
    const initialPnl = slippage * tradeAmount * executedPrice;
    const riskDecisions = await postTradeCheck(req.user!.id, body.agentId, initialPnl);
    // ---- END POST-TRADE ----

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
      risk: {
        warnings: riskCheck.warnings,
        riskPercent: riskCheck.riskPercent,
        stopLoss: effectiveStopLoss,
        takeProfitLevels: riskCheck.takeProfitLevels,
        postTradeDecisions: riskDecisions,
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

// POST /api/trades/sync-prices — pull real entry prices from exchange order history
router.post("/sync-prices", async (req: Request, res: Response) => {
  const exchangeData = await getExchangeInstance(req.user!.id);
  if (!exchangeData) {
    res.status(400).json({ error: "No exchange connected" });
    return;
  }

  const { exchange, name: exchangeName } = exchangeData;

  // Get all trades with price=0 or very small price
  const brokenTrades = await prisma.trade.findMany({
    where: { userId: req.user!.id, price: { lt: 0.01 } },
  });

  if (brokenTrades.length === 0) {
    res.json({ message: "All trades have valid entry prices", fixed: 0 });
    return;
  }

  let fixed = 0;
  const results: Array<{ id: string; symbol: string; oldPrice: number; newPrice: number }> = [];

  for (const trade of brokenTrades) {
    try {
      // Fetch closed orders from exchange for this symbol
      const orders = await exchange.fetchClosedOrders(trade.symbol, undefined, 50);

      // Find the matching order by time proximity (within 5 minutes of trade creation)
      const tradeTime = new Date(trade.createdAt).getTime();
      const matchingOrder = orders.find((o: any) => {
        const orderTime = o.timestamp || new Date(o.datetime).getTime();
        return Math.abs(orderTime - tradeTime) < 5 * 60 * 1000; // 5 min window
      });

      if (matchingOrder) {
        const realPrice = matchingOrder.average || matchingOrder.price || 0;
        if (realPrice > 0) {
          await prisma.trade.update({
            where: { id: trade.id },
            data: { price: realPrice },
          });
          results.push({ id: trade.id, symbol: trade.symbol, oldPrice: trade.price, newPrice: realPrice });
          fixed++;
          continue;
        }
      }

      // Fallback: try fetchMyTrades for this symbol
      const myTrades = await exchange.fetchMyTrades(trade.symbol, undefined, 50);
      const matchingTrade = myTrades.find((t: any) => {
        const tTime = t.timestamp || new Date(t.datetime).getTime();
        return Math.abs(tTime - tradeTime) < 5 * 60 * 1000;
      });

      if (matchingTrade && matchingTrade.price > 0) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { price: matchingTrade.price },
        });
        results.push({ id: trade.id, symbol: trade.symbol, oldPrice: trade.price, newPrice: matchingTrade.price });
        fixed++;
      }
    } catch (err: any) {
      console.error(`Failed to sync price for trade ${trade.id}: ${err?.message}`);
    }
  }

  // Reset profit to 0 for fixed trades so P&L recalculates from real entry
  if (fixed > 0) {
    await prisma.trade.updateMany({
      where: { id: { in: results.map(r => r.id) } },
      data: { profit: 0 },
    });
  }

  res.json({ message: `Fixed ${fixed}/${brokenTrades.length} trades`, fixed, results });
});

// GET /api/trades/pnl — live P&L for open trades (lightweight, poll frequently)
router.get("/pnl", async (req: Request, res: Response) => {
  const openTrades = await prisma.trade.findMany({
    where: { userId: req.user!.id, status: "OPEN" },
    include: { agent: { select: { id: true, name: true, personality: true } } },
  });

  if (openTrades.length === 0) {
    res.json({ trades: [], totalPnl: 0 });
    return;
  }

  const exchangeData = await getExchangeInstance(req.user!.id);
  if (!exchangeData) {
    // Return trades with stored profit if exchange unavailable
    const totalPnl = openTrades.reduce((sum, t) => sum + t.profit, 0);
    res.json({ trades: openTrades, totalPnl });
    return;
  }

  const { exchange } = exchangeData;
  const symbols = [...new Set(openTrades.map(t => t.symbol))];
  const prices: Record<string, number> = {};

  // Fetch all tickers in parallel
  await Promise.all(symbols.map(async (symbol) => {
    try {
      const ticker = await exchange.fetchTicker(symbol);
      prices[symbol] = ticker?.last || 0;
    } catch { /* skip */ }
  }));

  // Backfill missing entry prices — try exchange order history first
  const tradesNeedingPrice = openTrades.filter(t => !t.price || t.price < 0.01);
  if (tradesNeedingPrice.length > 0) {
    for (const trade of tradesNeedingPrice) {
      let realPrice = 0;

      // Try fetchMyTrades for the real fill price
      try {
        const tradeTime = new Date(trade.createdAt).getTime();
        const myTrades = await exchange.fetchMyTrades(trade.symbol, undefined, 20);
        const match = myTrades.find((t: any) => {
          const tTime = t.timestamp || new Date(t.datetime).getTime();
          return Math.abs(tTime - tradeTime) < 5 * 60 * 1000;
        });
        if (match?.price) realPrice = match.price;
      } catch { /* skip */ }

      // Fallback to live price if exchange history unavailable
      if (!realPrice) realPrice = prices[trade.symbol] || 0;

      if (realPrice > 0) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { price: realPrice, profit: 0 },
        });
        (trade as any).price = realPrice;
      }
    }
  }

  let totalPnl = 0;
  const updated = openTrades.map((trade) => {
    const currentPrice = prices[trade.symbol] || 0;
    let pnl = trade.profit;
    const entryPrice = trade.price || 0;

    if (currentPrice && entryPrice) {
      if (trade.side === "BUY") {
        pnl = (currentPrice - entryPrice) * trade.amount;
      } else {
        pnl = (entryPrice - currentPrice) * trade.amount;
      }
      pnl = Math.round(pnl * 100) / 100;

      // Persist if changed
      if (pnl !== trade.profit) {
        prisma.trade.update({
          where: { id: trade.id },
          data: { profit: pnl },
        }).catch(() => {});

        if (trade.agentId) {
          prisma.agent.update({
            where: { id: trade.agentId },
            data: { profit: { increment: pnl - trade.profit } },
          }).catch(() => {});
        }
      }

      // Auto-close on SL/TP hit
      let hit = false;
      if (trade.side === "BUY") {
        if (trade.stopLoss && currentPrice <= trade.stopLoss) hit = true;
        if (trade.takeProfit && currentPrice >= trade.takeProfit) hit = true;
      } else {
        if (trade.stopLoss && currentPrice >= trade.stopLoss) hit = true;
        if (trade.takeProfit && currentPrice <= trade.takeProfit) hit = true;
      }
      if (hit) {
        prisma.trade.update({ where: { id: trade.id }, data: { status: "CLOSED", profit: pnl } }).catch(() => {});
      }
    }

    totalPnl += pnl;
    return {
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      entryPrice: entryPrice,
      currentPrice: currentPrice || entryPrice,
      profit: pnl,
      pnlPercent: entryPrice ? ((currentPrice - entryPrice) / entryPrice * 100 * (trade.side === "BUY" ? 1 : -1)) : 0,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      agent: trade.agent,
      createdAt: trade.createdAt,
    };
  });

  totalPnl = Math.round(totalPnl * 100) / 100;
  res.json({ trades: updated, totalPnl });
});

export default router;
