import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma, Personality } from "@prisma/client";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireVerified } from "../middleware/requireVerified";
import { decrypt } from "../lib/crypto";

const router = Router();

// GET /api/agents/active — worker endpoint, returns all running agents with userId + exchange config
router.get("/active", async (req: Request, res: Response) => {
  const workerSecret = req.headers["x-worker-auth"] as string | undefined;
  if (!workerSecret || workerSecret !== process.env.WORKER_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const agents = await prisma.agent.findMany({
    where: { status: "RUNNING" },
    include: {
      user: {
        select: {
          id: true,
          exchanges: {
            where: { connected: true },
            orderBy: { createdAt: "desc" as const },
            take: 1,
            select: { name: true, apiKey: true, apiSecret: true },
          },
        },
      },
    },
  });

  // Flatten into the shape the worker expects
  const result = agents.map((agent) => {
    const exchange = agent.user.exchanges[0];
    const strategyObj = agent.strategy as Record<string, unknown> || {};

    // Resolve strategy type: explicit > personality-based fallback
    const personalityStrategyMap: Record<string, string> = {
      NOVA: "safeflow",
      SAGE: "trend_pro",
      APEX: "beast_mode",
      ECHO: "trend_pro",
    };
    const strategyType =
      (strategyObj.type as string) ||
      (strategyObj.strategy as string) ||
      personalityStrategyMap[agent.personality] ||
      "dca";

    return {
      id: agent.id,
      userId: agent.user.id,
      name: agent.name,
      personality: agent.personality,
      strategy: strategyType,
      strategyConfig: {
        ...strategyObj,
        assets: agent.assets,
      },
      riskLevel: agent.riskLevel,
      assets: agent.assets,
      profit: agent.profit,
      totalTrades: agent.totalTrades,
      consecutiveLosses: agent.consecutiveLosses,
      cooldownUntil: agent.cooldownUntil,
      exchangeConfig: exchange
        ? {
            exchange: exchange.name.toLowerCase(),
            apiKey: decrypt(exchange.apiKey),
            secret: decrypt(exchange.apiSecret),
            mode: process.env.TRADING_MODE || "paper",
          }
        : { mode: "paper" },
    };
  });

  res.json({ agents: result });
});

// GET /api/agents/marketplace — public marketplace agents (no auth required)
router.get("/marketplace", async (_req: Request, res: Response) => {
  const agents = await prisma.agent.findMany({
    where: { status: "RUNNING" },
    select: {
      id: true,
      name: true,
      personality: true,
      strategy: true,
      riskLevel: true,
      assets: true,
      profit: true,
      totalTrades: true,
      subscriptionPrice: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ agents });
});

// Viewer tracking for Market Intelligence
const intelViewers = new Set<string>();

// GET /api/agents/intel — public market intelligence feed (no auth)
router.get("/intel", async (req: Request, res: Response) => {
  // Track viewer by IP or forwarded header
  const viewerId = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || `anon-${Date.now()}`;
  intelViewers.add(viewerId);

  // Auto-remove viewer after 45 seconds (they'll re-poll if still watching)
  setTimeout(() => intelViewers.delete(viewerId), 45000);

  const recentLogs = await prisma.activityLog.findMany({
    where: {
      type: { in: ["INSIGHT", "TRADE"] },
      agent: { isNot: null },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      agent: { select: { id: true, name: true, personality: true } },
    },
  });

  const feed = recentLogs.map(log => {
    const replyMatch = log.message.match(/^@(\w+)/);
    return {
      id: log.id,
      agentName: log.agent?.name || "Agent",
      personality: (log.agent?.personality?.toLowerCase() || "sage"),
      message: log.message,
      replyTo: replyMatch ? replyMatch[1] : null,
      type: log.type,
      timestamp: log.createdAt.toISOString(),
    };
  });

  res.json({ feed, viewers: intelViewers.size });
});

router.use(authMiddleware);

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  personality: z.enum(["NOVA", "SAGE", "APEX", "ECHO"]),
  strategy: z.record(z.unknown()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assets: z.array(z.string().min(1)).min(1, "At least one asset is required"),
  sourceAgentId: z.string().optional(),
  subscriptionPrice: z.number().min(0).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["RUNNING", "PAUSED", "STOPPED"]).optional(),
  strategy: z.record(z.unknown()).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assets: z.array(z.string().min(1)).min(1).optional(),
});

// GET /api/agents
router.get("/", async (req: Request, res: Response) => {
  const agents = await prisma.agent.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { trades: true } },
    },
  });

  res.json({ agents });
});

// POST /api/agents
router.post("/", requireVerified, async (req: Request, res: Response) => {
  try {
    const body = createAgentSchema.parse(req.body);
    const userId = req.user!.id;
    const hasSubscription = body.subscriptionPrice && body.subscriptionPrice > 0;

    // If subscription agent, pre-check gas balance (atomic check inside transaction below)
    if (hasSubscription) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { gasBalance: true },
      });

      if ((user?.gasBalance || 0) < body.subscriptionPrice!) {
        res.status(400).json({
          error: `Insufficient gas balance. You need $${body.subscriptionPrice!.toFixed(2)} but have $${(user?.gasBalance || 0).toFixed(2)}. Top up in Settings.`,
        });
        return;
      }
    }

    const agentData = {
      userId,
      name: body.name,
      personality: body.personality as Personality,
      strategy: body.strategy as Prisma.InputJsonValue,
      riskLevel: body.riskLevel,
      assets: body.assets,
      ...(hasSubscription
        ? {
            sourceAgentId: body.sourceAgentId || null,
            subscriptionPrice: body.subscriptionPrice!,
            subscriptionStatus: "active",
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        : {}),
    };

    if (hasSubscription) {
      // Atomic: re-check balance, create agent + deduct gas inside transaction
      const [agent] = await prisma.$transaction(async (tx) => {
        const freshUser = await tx.user.findUnique({ where: { id: userId }, select: { gasBalance: true } });
        if (!freshUser || freshUser.gasBalance < body.subscriptionPrice!) {
          throw new Error(`Insufficient gas balance. You need $${body.subscriptionPrice!.toFixed(2)} but have $${(freshUser?.gasBalance || 0).toFixed(2)}. Top up in Settings.`);
        }
        const newAgent = await tx.agent.create({ data: agentData });
        await tx.user.update({
          where: { id: userId },
          data: { gasBalance: { decrement: body.subscriptionPrice! } },
        });
        return [newAgent] as const;
      });

      await prisma.activityLog.create({
        data: {
          userId,
          agentId: agent.id,
          type: "INSIGHT",
          message: `Subscribed to "${agent.name}" — $${body.subscriptionPrice!.toFixed(2)}/mo deducted from gas balance`,
        },
      });

      res.status(201).json({ agent });
    } else {
      const agent = await prisma.agent.create({ data: agentData });

      await prisma.activityLog.create({
        data: {
          userId,
          agentId: agent.id,
          type: "INSIGHT",
          message: `Agent "${agent.name}" created with ${agent.personality} personality`,
        },
      });

      res.status(201).json({ agent });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/agents/:id
router.get("/:id", async (req: Request, res: Response) => {
  const agentId = req.params.id as string;
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: req.user!.id },
    include: {
      trades: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { trades: true } },
    },
  });

  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  res.json({ agent });
});

// PATCH /api/agents/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id as string;
    const body = updateAgentSchema.parse(req.body);

    const existing = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...body,
        strategy: body.strategy ? (body.strategy as Prisma.InputJsonValue) : undefined,
      },
    });

    if (body.status && body.status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          agentId: agent.id,
          type: "INSIGHT",
          message: `Agent "${agent.name}" status changed to ${agent.status}`,
        },
      });
    }

    res.json({ agent });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/agents/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const agentId = req.params.id as string;
  const existing = await prisma.agent.findFirst({
    where: { id: agentId, userId: req.user!.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  await prisma.agent.delete({ where: { id: agentId } });

  res.json({ message: "Agent deleted successfully" });
});

// POST /api/agents/:id/resubscribe — reactivate a paused subscription
router.post("/:id/resubscribe", async (req: Request, res: Response) => {
  const agentId = req.params.id as string;
  const userId = req.user!.id;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  if (!agent.subscriptionPrice || agent.subscriptionStatus !== "paused_no_gas") {
    res.status(400).json({ error: "Agent does not have a paused subscription" });
    return;
  }

  // Pre-check gas balance (atomic check inside transaction below)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gasBalance: true },
  });

  if ((user?.gasBalance || 0) < agent.subscriptionPrice) {
    res.status(400).json({
      error: `Insufficient gas balance. You need $${agent.subscriptionPrice.toFixed(2)} but have $${(user?.gasBalance || 0).toFixed(2)}.`,
    });
    return;
  }

  // Atomic: re-check balance and deduct inside transaction to prevent race condition
  await prisma.$transaction(async (tx) => {
    const freshUser = await tx.user.findUnique({ where: { id: userId }, select: { gasBalance: true } });
    if (!freshUser || freshUser.gasBalance < agent.subscriptionPrice!) {
      throw new Error(`Insufficient gas balance. You need $${agent.subscriptionPrice!.toFixed(2)} but have $${(freshUser?.gasBalance || 0).toFixed(2)}.`);
    }
    await tx.user.update({
      where: { id: userId },
      data: { gasBalance: { decrement: agent.subscriptionPrice! } },
    });
    await tx.agent.update({
      where: { id: agentId },
      data: {
        subscriptionStatus: "active",
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.activityLog.create({
      data: {
        userId,
        agentId,
        type: "INSIGHT",
        message: `Subscription reactivated for "${agent.name}" — $${agent.subscriptionPrice!.toFixed(2)} deducted`,
      },
    });
  });

  const updated = await prisma.agent.findUnique({ where: { id: agentId } });
  res.json({ agent: updated });
});

export default router;
