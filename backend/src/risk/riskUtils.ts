// ---------------------------------------------------------------------------
// Risk Engine — Utility functions
// ---------------------------------------------------------------------------

import type { TakeProfitLevel } from "./riskTypes";

/**
 * Calculate the maximum position size (in USD) given a balance and risk %.
 */
export function calculatePositionSize(
  balance: number,
  riskPercent: number
): number {
  if (balance <= 0 || riskPercent <= 0) return 0;
  return Math.floor(balance * riskPercent * 100) / 100;
}

/**
 * Calculate what percentage of the portfolio a trade represents.
 */
export function tradeRiskPercent(
  tradeValueUsd: number,
  totalBalance: number
): number {
  if (totalBalance <= 0) return 1; // 100% if no balance — max risk
  return tradeValueUsd / totalBalance;
}

/**
 * Calculate stop-loss price based on entry and risk %.
 * For BUY: stop below entry. For SELL/SHORT: stop above entry.
 */
export function calculateStopLoss(
  entryPrice: number,
  side: "BUY" | "SELL",
  stopPercent: number = 0.03 // default 3%
): number {
  if (side === "BUY") {
    return Math.round(entryPrice * (1 - stopPercent) * 100000000) / 100000000;
  }
  return Math.round(entryPrice * (1 + stopPercent) * 100000000) / 100000000;
}

/**
 * Generate take-profit levels for scaling out of a position.
 *  +3% → sell 33%
 *  +5% → sell 33%
 * +10% → sell 34% (remainder)
 */
export function calculateTakeProfitLevels(
  entryPrice: number,
  side: "BUY" | "SELL"
): TakeProfitLevel[] {
  const levels = [
    { percent: 3, sellFraction: 0.33 },
    { percent: 5, sellFraction: 0.33 },
    { percent: 10, sellFraction: 0.34 },
  ];

  return levels.map(({ percent, sellFraction }) => {
    const multiplier = side === "BUY" ? 1 + percent / 100 : 1 - percent / 100;
    return {
      percent,
      sellFraction,
      targetPrice: Math.round(entryPrice * multiplier * 100000000) / 100000000,
    };
  });
}

/**
 * Determine stop-loss % based on asset volatility tier.
 * Uses a simple lookup — in production this would use ATR or realized vol.
 */
export function volatilityStopPercent(symbol: string): number {
  const high = ["DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "MEME"];
  const medium = ["SOL", "AVAX", "LINK", "DOT", "MATIC", "ARB", "OP"];
  // BTC, ETH default to low

  const base = symbol.split("/")[0]?.toUpperCase() || symbol.toUpperCase();

  if (high.some((s) => base.includes(s))) return 0.05;   // 5% for memecoins
  if (medium.some((s) => base.includes(s))) return 0.035; // 3.5% for mid-caps
  return 0.02; // 2% for majors (BTC, ETH)
}

/**
 * Check if current time is within a cooldown window.
 */
export function isInCooldown(cooldownUntil: Date | null): boolean {
  if (!cooldownUntil) return false;
  return new Date() < new Date(cooldownUntil);
}

/**
 * Compute the cooldown duration (in ms) based on consecutive losses.
 * 3 losses = 30 min, 6 = 60 min, 9+ = 120 min.
 */
export function cooldownDurationMs(consecutiveLosses: number): number {
  if (consecutiveLosses >= 9) return 120 * 60 * 1000; // 2 hours
  if (consecutiveLosses >= 6) return 60 * 60 * 1000;  // 1 hour
  if (consecutiveLosses >= 3) return 30 * 60 * 1000;  // 30 min
  return 0;
}
