import { Router, Request, Response } from "express";
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

export default router;
