import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /api/payments/receipt — upload a receipt (auth required)
router.post("/receipt", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { plan, amount, receiptData, fileName } = req.body;

    if (!plan || !amount || !receiptData || !fileName) {
      res.status(400).json({ error: "Missing required fields: plan, amount, receiptData, fileName" });
      return;
    }

    const receipt = await prisma.paymentReceipt.create({
      data: {
        userId: req.user!.id,
        plan,
        amount: parseFloat(amount),
        receiptData,
        fileName,
      },
    });

    res.status(201).json({ receipt: { id: receipt.id, status: receipt.status } });
  } catch (err) {
    throw err;
  }
});

// GET /api/payments/receipts — get user's receipts (auth required)
router.get("/receipts", authMiddleware, async (req: Request, res: Response) => {
  const receipts = await prisma.paymentReceipt.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, plan: true, amount: true, fileName: true, status: true, createdAt: true },
  });

  res.json({ receipts });
});

export default router;
