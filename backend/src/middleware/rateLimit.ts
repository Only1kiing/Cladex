// ---------------------------------------------------------------------------
// Rate limiting middleware — prevents brute force, API abuse, cost overruns
// ---------------------------------------------------------------------------

import rateLimit from "express-rate-limit";

// General API rate limit — 100 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// Auth endpoints — 10 attempts per 15 minutes (brute force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

// AI endpoints — 20 requests per minute (cost control)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait a moment." },
});

// Trade execution — 30 per minute (prevents runaway agents)
export const tradeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trade rate limit reached. Slow down." },
});

// Backtest — 5 per minute (expensive operation)
export const backtestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Backtest rate limit reached. Try again in a minute." },
});

// Signup — 5 per hour per IP (spam prevention)
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Try again later." },
});
