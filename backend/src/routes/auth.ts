import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";
import { config } from "../config";
import { authMiddleware } from "../middleware/auth";
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service";

const router = Router();

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Look up referrer if a referral code was provided
    let referrerId: string | undefined;
    if (body.referralCode) {
      const referrer = await prisma.user.findFirst({
        where: {
          OR: [
            { referralCode: body.referralCode },
            { id: body.referralCode },
          ],
        },
        select: { id: true },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        referralCode: undefined as any, // will be set after we have the id
        ...(referrerId ? { referredBy: referrerId } : {}),
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // Set referral code to first 8 chars of the user's cuid ID
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: user.id.slice(0, 8) },
    });

    // Award referrer 500 founding points
    if (referrerId) {
      await prisma.user.update({
        where: { id: referrerId },
        data: { foundingPoints: { increment: 500 } },
      });
    }

    const token = generateToken(user.id);

    // Generate verification code and send email
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExp: expiry,
      },
    });

    await sendVerificationEmail(body.email, code, body.name);

    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
    },
  });

  res.json({ user });
});

// POST /api/auth/verify-email
router.post("/verify-email", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Verification code is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        verificationCode: true,
        verificationExp: true,
        emailVerified: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    if (!user.verificationCode || !user.verificationExp) {
      res.status(400).json({ error: "No verification code found. Please request a new one." });
      return;
    }

    if (new Date() > user.verificationExp) {
      res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      return;
    }

    if (user.verificationCode !== code) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExp: null,
      },
    });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    throw err;
  }
});

// POST /api/auth/resend-code
router.post("/resend-code", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        verificationCode: code,
        verificationExp: expiry,
      },
    });

    await sendVerificationEmail(user.email, code, user.name);

    res.json({ message: "Verification code sent" });
  } catch (err) {
    throw err;
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Always return 200 to avoid leaking user existence
    if (!user) {
      res.json({ message: "If that email is registered, a reset code has been sent." });
      return;
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiry: expiry,
      },
    });

    await sendPasswordResetEmail(email, code, user.name);

    res.json({ message: "If that email is registered, a reset code has been sent." });
  } catch (err) {
    throw err;
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Reset code is required" });
      return;
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, resetCode: true, resetCodeExpiry: true },
    });

    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      res.status(400).json({ error: "Invalid or expired reset code" });
      return;
    }

    if (new Date() > user.resetCodeExpiry) {
      res.status(400).json({ error: "Reset code has expired. Please request a new one." });
      return;
    }

    if (user.resetCode !== code) {
      res.status(400).json({ error: "Invalid reset code" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    throw err;
  }
});

export default router;
