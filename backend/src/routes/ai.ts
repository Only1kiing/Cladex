import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { generateAgentConfig, askAgent, chatWithAI } from "../services/ai.service";

const router = Router();
router.use(authMiddleware);

const generateAgentSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(1000),
});

const askAgentSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  question: z
    .string()
    .min(1, "Question is required")
    .max(500),
});

// POST /api/ai/generate-agent
router.post("/generate-agent", async (req: Request, res: Response) => {
  try {
    const body = generateAgentSchema.parse(req.body);

    const agentConfig = await generateAgentConfig(body.prompt);

    res.json({ agentConfig });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(502).json({ error: "AI returned invalid response" });
      return;
    }
    throw err;
  }
});

// POST /api/ai/ask-agent
router.post("/ask-agent", async (req: Request, res: Response) => {
  try {
    const body = askAgentSchema.parse(req.body);

    const agent = await prisma.agent.findFirst({
      where: { id: body.agentId, userId: req.user!.id },
    });

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const recentTrades = await prisma.trade.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const response = await askAgent(agent, recentTrades, body.question);

    res.json({ response });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history, exchangeConnected } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const response = await chatWithAI(
      message,
      Array.isArray(history) ? history : [],
      exchangeConnected === true
    );

    res.json({ response });
  } catch (err) {
    throw err;
  }
});

export default router;
