import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import prisma from "../lib/prisma";

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    next(err);
  }
}
