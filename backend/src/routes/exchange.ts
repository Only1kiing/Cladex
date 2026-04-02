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

function createExchangeInstance(exchangeName: string, apiKey: string, apiSecret: string) {
  const ccxtId = SUPPORTED_EXCHANGES[exchangeName.toLowerCase()];
  if (!ccxtId) return null;
  const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
  if (!ExchangeClass) return null;
  return new ExchangeClass({
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
    timeout: 15000,
  });
}

async function fetchExchangeBalance(
  exchangeName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ total: number; balances: { asset: string; free: number; total: number }[] }> {
  const exchange = createExchangeInstance(exchangeName, apiKey, apiSecret);
  if (!exchange) return { total: 0, balances: [] };

  try {
    const bal = await exchange.fetchBalance();
    const balances: { asset: string; free: number; total: number; usdValue?: number }[] = [];
    let total = 0;
    const stables = ["USDT", "USDC", "USD", "BUSD", "DAI", "TUSD"];

    for (const [asset, data] of Object.entries(bal.total || {})) {
      const amount = data as number;
      if (amount > 0) {
        const free = (bal.free?.[asset] as number) || 0;
        if (stables.includes(asset)) {
          balances.push({ asset, free, total: amount, usdValue: amount });
          total += amount;
        } else {
          try {
            const ticker = await exchange.fetchTicker(`${asset}/USDT`);
            const usdValue = amount * (ticker?.last || 0);
            balances.push({ asset, free, total: amount, usdValue });
            total += usdValue;
          } catch {
            balances.push({ asset, free, total: amount, usdValue: 0 });
          }
        }
      }
    }

    balances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
    return { total: Math.round(total * 100) / 100, balances };
  } catch {
    return { total: 0, balances: [] };
  }
}

async function validateExchangeKeys(
  exchangeName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ valid: boolean; error?: string }> {
  const ccxtId = SUPPORTED_EXCHANGES[exchangeName.toLowerCase()];
  if (!ccxtId) {
    // Unsupported exchange — skip validation, just store
    return { valid: true };
  }

  try {
    const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
    if (!ExchangeClass) return { valid: true };

    const exchange = new ExchangeClass({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      timeout: 10000,
    });

    // Try fetching balance — if keys are invalid, this will throw
    await exchange.fetchBalance();
    return { valid: true };
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("Invalid API") || msg.includes("invalid key") || msg.includes("AuthenticationError") || msg.includes("API key")) {
      return { valid: false, error: "Invalid API keys. Please check and try again." };
    }
    if (msg.includes("permission") || msg.includes("Permission")) {
      return { valid: false, error: "API keys lack required permissions. Enable trade access." };
    }
    // Network/timeout errors — don't block, assume valid
    return { valid: true };
  }
}

const router = Router();
router.use(authMiddleware);

const connectExchangeSchema = z.object({
  name: z.string().min(1, "Exchange name is required").max(50),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
});

// POST /api/exchange/connect
router.post("/connect", async (req: Request, res: Response) => {
  try {
    const body = connectExchangeSchema.parse(req.body);

    // Validate API keys against the exchange
    const validation = await validateExchangeKeys(body.name, body.apiKey, body.apiSecret);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const exchange = await prisma.exchange.create({
      data: {
        userId: req.user!.id,
        name: body.name,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
      },
      select: {
        id: true,
        name: true,
        connected: true,
        createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        type: "INSIGHT",
        message: `Connected ${exchange.name} exchange`,
      },
    });

    // Fetch balance after successful connection
    const balance = await fetchExchangeBalance(body.name, body.apiKey, body.apiSecret);

    res.status(201).json({ exchange, balance });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/exchange/balance — fetch live balance from connected exchange
router.get("/balance", async (req: Request, res: Response) => {
  const exchangeRecord = await prisma.exchange.findFirst({
    where: { userId: req.user!.id, connected: true },
    orderBy: { createdAt: "desc" },
  });

  if (!exchangeRecord) {
    res.json({ connected: false, total: 0, balances: [] });
    return;
  }

  const balance = await fetchExchangeBalance(
    exchangeRecord.name,
    exchangeRecord.apiKey,
    exchangeRecord.apiSecret
  );

  res.json({ connected: true, exchange: exchangeRecord.name, ...balance });
});

// GET /api/exchange
router.get("/", async (req: Request, res: Response) => {
  const exchanges = await prisma.exchange.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      name: true,
      connected: true,
      createdAt: true,
      // Never return apiKey/apiSecret in list responses
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ exchanges });
});

// DELETE /api/exchange/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const exchangeId = req.params.id as string;
  const existing = await prisma.exchange.findFirst({
    where: { id: exchangeId, userId: req.user!.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Exchange connection not found" });
    return;
  }

  await prisma.exchange.delete({ where: { id: exchangeId } });

  res.json({ message: "Exchange disconnected successfully" });
});

export default router;
