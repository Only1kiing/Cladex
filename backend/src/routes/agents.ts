import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  personality: z.enum(["NOVA", "SAGE", "APEX", "ECHO"]),
  strategy: z.record(z.unknown()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  assets: z.array(z.string().min(1)).min(1, "At least one asset is required"),
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
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = createAgentSchema.parse(req.body);

    const agent = await prisma.agent.create({
      data: {
        userId: req.user!.id,
        name: body.name,
        personality: body.personality,
        strategy: body.strategy,
        riskLevel: body.riskLevel,
        assets: body.assets,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        agentId: agent.id,
        type: "INSIGHT",
        message: `Agent "${agent.name}" created with ${agent.personality} personality`,
      },
    });

    res.status(201).json({ agent });
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
  const agent = await prisma.agent.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
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
    const body = updateAgentSchema.parse(req.body);

    const existing = await prisma.agent.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: body,
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
  const existing = await prisma.agent.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (!existing) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  await prisma.agent.delete({ where: { id: req.params.id } });

  res.json({ message: "Agent deleted successfully" });
});

export default router;
