import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

/**
 * Middleware that blocks requests when the authenticated user has not
 * verified their email. Must be used AFTER authMiddleware so `req.user`
 * is populated.
 */
// TEMPORARY: Email enforcement disabled until Resend DNS is verified.
// Set REQUIRE_EMAIL_VERIFICATION=true in env once email delivery works.
const ENFORCE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === "true";

export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!ENFORCE_EMAIL_VERIFICATION) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      res.status(403).json({
        error: "Email verification required",
        code: "EMAIL_NOT_VERIFIED",
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
