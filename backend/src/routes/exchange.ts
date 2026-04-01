import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

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

    // In production, encrypt apiKey and apiSecret before storing.
    // For now we store as-is; a real deployment would use AES-256-GCM
    // with a key from a secrets manager.
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

    res.status(201).json({ exchange });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
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
