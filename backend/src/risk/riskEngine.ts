// ---------------------------------------------------------------------------
// Risk Engine — Core validation and enforcement
// ---------------------------------------------------------------------------
//
// Every trade flows through this engine BEFORE execution.
// After execution, post-trade checks enforce drawdown and cooldown rules.
//
// Fail-safe: if any data is missing or ambiguous, BLOCK the trade.
// Capital preservation > profit. Always.
// ---------------------------------------------------------------------------

import prisma from "../lib/prisma";
import type {
  TradeRequest,
  RiskCheckResult,
  RiskConfig,
  PortfolioSnapshot,
  CooldownState,
  RiskDecision,
} from "./riskTypes";
import { DEFAULT_RISK_CONFIG } from "./riskTypes";
import {
  calculatePositionSize,
  tradeRiskPercent,
  calculateStopLoss,
  calculateTakeProfitLevels,
  volatilityStopPercent,
  isInCooldown,
  cooldownDurationMs,
} from "./riskUtils";

// ---------------------------------------------------------------------------
// 1. PRE-TRADE VALIDATION — the gatekeeper
// ---------------------------------------------------------------------------

/**
 * Validate a trade request against ALL risk rules.
 * Returns { allowed, reason, adjustedAmount, ... }
 *
 * This is the single entry point. If allowed=false, DO NOT EXECUTE.
 */
export async function validateTrade(
  trade: TradeRequest
): Promise<RiskCheckResult> {
  const warnings: string[] = [];

  // ---- Load user with risk config ----
  const user = await prisma.user.findUnique({
    where: { id: trade.userId },
    select: {
      id: true,
      maxRiskPerTrade: true,
      maxExposure: true,
      dailyLossLimit: true,
      maxDrawdown: true,
      riskLocked: true,
      riskLockedReason: true,
      peakBalance: true,
      gasBalance: true,
    },
  });

  if (!user) {
    return blocked("User not found");
  }

  // ---- 0. Account lock check ----
  if (user.riskLocked) {
    return blocked(
      `Account locked: ${user.riskLockedReason || "risk limit breached"}. Contact support to unlock.`
    );
  }

  const config: RiskConfig = {
    maxRiskPerTrade: user.maxRiskPerTrade,
    maxExposure: user.maxExposure,
    dailyLossLimit: user.dailyLossLimit,
    maxDrawdown: user.maxDrawdown,
  };

  // ---- 1. Agent cooldown check ----
  if (trade.agentId) {
    const cooldown = await checkAgentCooldown(trade.agentId);
    if (cooldown.inCooldown) {
      const mins = Math.ceil(
        ((cooldown.cooldownUntil?.getTime() || 0) - Date.now()) / 60000
      );
      return blocked(
        `Agent paused due to ${cooldown.consecutiveLosses} consecutive losses. Cooldown: ${mins} min remaining.`
      );
    }
  }

  // ---- 2. Get portfolio snapshot ----
  const portfolio = await getPortfolioSnapshot(trade.userId);

  if (portfolio.totalBalance <= 0) {
    return blocked("No balance data available — cannot assess risk. Connect an exchange and top up.");
  }

  // ---- 3. Daily loss limit ----
  const dailyLossCheck = checkDailyLoss(portfolio, config);
  if (!dailyLossCheck.allowed) {
    // Lock the account
    await lockAccount(
      trade.userId,
      dailyLossCheck.reason || "Daily loss limit breached"
    );
    return blocked(dailyLossCheck.reason || "Daily loss limit breached");
  }
  if (dailyLossCheck.reason) warnings.push(dailyLossCheck.reason);

  // ---- 4. Max drawdown ----
  const drawdownCheck = checkDrawdown(portfolio, config);
  if (!drawdownCheck.allowed) {
    await lockAccount(
      trade.userId,
      drawdownCheck.reason || "Max drawdown breached"
    );
    return blocked(drawdownCheck.reason || "Max drawdown breached");
  }
  if (drawdownCheck.reason) warnings.push(drawdownCheck.reason);

  // ---- 5. Position size limit ----
  const tradeValueUsd =
    trade.quoteAmount || trade.amount * trade.price;
  const maxPositionUsd = calculatePositionSize(
    portfolio.totalBalance,
    config.maxRiskPerTrade
  );

  let adjustedAmount = trade.amount;

  if (tradeValueUsd > maxPositionUsd) {
    // Reduce to max allowed
    adjustedAmount = Math.floor((maxPositionUsd / trade.price) * 100000000) / 100000000;
    if (adjustedAmount <= 0) {
      return blocked(
        `Trade value ($${tradeValueUsd.toFixed(2)}) exceeds max risk per trade ($${maxPositionUsd.toFixed(2)}) and cannot be reduced.`
      );
    }
    warnings.push(
      `Position reduced: $${tradeValueUsd.toFixed(2)} → $${(adjustedAmount * trade.price).toFixed(2)} (${(config.maxRiskPerTrade * 100).toFixed(0)}% limit)`
    );
  }

  // ---- 6. Portfolio exposure ----
  const adjustedTradeValue = adjustedAmount * trade.price;
  const newExposure = portfolio.openExposure + adjustedTradeValue;
  const maxExposureUsd = portfolio.totalBalance * config.maxExposure;

  if (newExposure > maxExposureUsd) {
    const remainingCapacity = maxExposureUsd - portfolio.openExposure;
    if (remainingCapacity <= 0) {
      return blocked(
        `Max portfolio exposure reached (${(config.maxExposure * 100).toFixed(0)}% = $${maxExposureUsd.toFixed(2)}). Close positions before opening new ones.`
      );
    }
    // Reduce to fit within exposure cap
    adjustedAmount = Math.floor((remainingCapacity / trade.price) * 100000000) / 100000000;
    if (adjustedAmount <= 0) {
      return blocked("Remaining exposure capacity too small for this trade.");
    }
    warnings.push(
      `Position reduced to fit exposure limit: $${(adjustedAmount * trade.price).toFixed(2)}`
    );
  }

  // ---- 7. Enforce stop-loss ----
  const stopPercent = volatilityStopPercent(trade.symbol);
  let adjustedStopLoss = trade.stopLoss;

  if (!adjustedStopLoss) {
    adjustedStopLoss = calculateStopLoss(trade.price, trade.side, stopPercent);
    warnings.push(
      `Auto stop-loss set at ${(stopPercent * 100).toFixed(1)}%: $${adjustedStopLoss.toFixed(2)}`
    );
  } else {
    // Validate user-provided stop isn't too far
    const maxStopPercent = 0.10; // 10% max stop distance
    const distance =
      trade.side === "BUY"
        ? (trade.price - adjustedStopLoss) / trade.price
        : (adjustedStopLoss - trade.price) / trade.price;

    if (distance > maxStopPercent) {
      adjustedStopLoss = calculateStopLoss(trade.price, trade.side, maxStopPercent);
      warnings.push(
        `Stop-loss too wide — tightened to 10%: $${adjustedStopLoss.toFixed(2)}`
      );
    }
    if (distance < 0) {
      // Stop is on wrong side — override
      adjustedStopLoss = calculateStopLoss(trade.price, trade.side, stopPercent);
      warnings.push(
        `Invalid stop-loss direction — corrected to $${adjustedStopLoss.toFixed(2)}`
      );
    }
  }

  // ---- 8. Take-profit levels ----
  const takeProfitLevels = calculateTakeProfitLevels(trade.price, trade.side);

  // ---- 9. Compute final risk percent ----
  const finalTradeValue = adjustedAmount * trade.price;
  const riskPercent = tradeRiskPercent(finalTradeValue, portfolio.totalBalance);

  return {
    allowed: true,
    adjustedAmount,
    adjustedStopLoss,
    takeProfitLevels,
    riskPercent,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// 2. POST-TRADE CHECKS — run after every execution
// ---------------------------------------------------------------------------

/**
 * Run after a trade executes. Updates PnL tracking, checks drawdown/daily
 * loss, applies cooldowns. Returns risk decisions that were triggered.
 */
export async function postTradeCheck(
  userId: string,
  agentId: string | undefined,
  tradeProfit: number
): Promise<RiskDecision[]> {
  const decisions: RiskDecision[] = [];

  // Update agent consecutive losses / wins
  if (agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { consecutiveLosses: true, name: true },
    });

    if (agent) {
      if (tradeProfit < 0) {
        const newLosses = agent.consecutiveLosses + 1;
        const cooldownMs = cooldownDurationMs(newLosses);

        const updateData: Record<string, unknown> = {
          consecutiveLosses: newLosses,
        };

        if (cooldownMs > 0) {
          const cooldownUntil = new Date(Date.now() + cooldownMs);
          updateData.cooldownUntil = cooldownUntil;
          updateData.status = "PAUSED";

          decisions.push({
            type: "AGENT_PAUSED",
            agentId,
            reason: `Agent "${agent.name}" paused: ${newLosses} consecutive losses. Cooldown ${cooldownMs / 60000} min.`,
          });

          await prisma.activityLog.create({
            data: {
              userId,
              agentId,
              type: "ALERT",
              message: `Agent "${agent.name}" auto-paused: ${newLosses} consecutive losses. Resumes at ${cooldownUntil.toISOString()}.`,
            },
          });
        }

        await prisma.agent.update({
          where: { id: agentId },
          data: updateData,
        });
      } else {
        // Reset consecutive losses on profit
        await prisma.agent.update({
          where: { id: agentId },
          data: { consecutiveLosses: 0, cooldownUntil: null },
        });
      }
    }
  }

  // Re-check portfolio health
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      maxDrawdown: true,
      dailyLossLimit: true,
      riskLocked: true,
    },
  });

  if (!user || user.riskLocked) return decisions;

  const portfolio = await getPortfolioSnapshot(userId);
  const config: RiskConfig = {
    ...DEFAULT_RISK_CONFIG,
    maxDrawdown: user.maxDrawdown,
    dailyLossLimit: user.dailyLossLimit,
  };

  // Daily loss check
  const dailyCheck = checkDailyLoss(portfolio, config);
  if (!dailyCheck.allowed) {
    await lockAccount(userId, dailyCheck.reason || "Daily loss limit breached");
    await stopAllAgents(userId);
    decisions.push({
      type: "ACCOUNT_LOCKED",
      userId,
      reason: dailyCheck.reason || "Daily loss limit breached — all agents stopped.",
    });
  }

  // Drawdown check
  const drawdownCheck = checkDrawdown(portfolio, config);
  if (!drawdownCheck.allowed) {
    await lockAccount(userId, drawdownCheck.reason || "Max drawdown breached");
    await stopAllAgents(userId);
    decisions.push({
      type: "ACCOUNT_LOCKED",
      userId,
      reason: drawdownCheck.reason || "Max drawdown breached — all agents stopped.",
    });
  }

  // Update peak balance
  if (portfolio.totalBalance > portfolio.peakBalance) {
    await prisma.user.update({
      where: { id: userId },
      data: { peakBalance: portfolio.totalBalance },
    });
  }

  return decisions;
}

// ---------------------------------------------------------------------------
// 3. Portfolio snapshot
// ---------------------------------------------------------------------------

export async function getPortfolioSnapshot(
  userId: string
): Promise<PortfolioSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { peakBalance: true, gasBalance: true },
  });

  // Get open positions' total value
  const openTrades = await prisma.trade.findMany({
    where: { userId, status: "OPEN" },
    select: { amount: true, price: true },
  });

  const openExposure = openTrades.reduce(
    (sum, t) => sum + t.amount * t.price,
    0
  );

  // Get 24-hour PnL
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTrades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: oneDayAgo },
    },
    select: { profit: true },
  });

  const dailyPnl = recentTrades.reduce((sum, t) => sum + t.profit, 0);

  // Total balance = gas balance serves as proxy; in production this would
  // call the exchange API. For the risk engine we use trade-derived data +
  // peak balance tracking.
  const totalBalance = user?.peakBalance || user?.gasBalance || 0;
  const peakBalance = user?.peakBalance || 0;

  const currentDrawdown =
    peakBalance > 0 ? (totalBalance - peakBalance) / peakBalance : 0;

  return {
    totalBalance,
    openExposure,
    dailyPnl,
    peakBalance,
    currentDrawdown,
  };
}

// ---------------------------------------------------------------------------
// 4. Individual risk checks
// ---------------------------------------------------------------------------

export function checkDailyLoss(
  portfolio: PortfolioSnapshot,
  config: RiskConfig
): { allowed: boolean; reason?: string } {
  if (portfolio.totalBalance <= 0) {
    return { allowed: true }; // no balance to lose
  }

  const dailyLossPercent = portfolio.dailyPnl / portfolio.totalBalance;

  // Warn at 60% of limit
  if (dailyLossPercent < config.dailyLossLimit * 0.6 && dailyLossPercent >= config.dailyLossLimit) {
    return {
      allowed: true,
      reason: `Warning: daily loss at ${(dailyLossPercent * 100).toFixed(1)}%, approaching limit of ${(config.dailyLossLimit * 100).toFixed(0)}%`,
    };
  }

  if (dailyLossPercent < config.dailyLossLimit) {
    return {
      allowed: false,
      reason: `Daily loss limit breached: ${(dailyLossPercent * 100).toFixed(1)}% (limit: ${(config.dailyLossLimit * 100).toFixed(0)}%). All trading halted.`,
    };
  }

  return { allowed: true };
}

export function checkDrawdown(
  portfolio: PortfolioSnapshot,
  config: RiskConfig
): { allowed: boolean; reason?: string } {
  if (portfolio.peakBalance <= 0) {
    return { allowed: true };
  }

  if (portfolio.currentDrawdown < config.maxDrawdown) {
    return {
      allowed: false,
      reason: `Max drawdown breached: ${(portfolio.currentDrawdown * 100).toFixed(1)}% from peak (limit: ${(config.maxDrawdown * 100).toFixed(0)}%). All trading halted.`,
    };
  }

  // Warn at 60% of limit
  if (portfolio.currentDrawdown < config.maxDrawdown * 0.6) {
    return {
      allowed: true,
      reason: `Warning: drawdown at ${(portfolio.currentDrawdown * 100).toFixed(1)}%, approaching limit of ${(config.maxDrawdown * 100).toFixed(0)}%`,
    };
  }

  return { allowed: true };
}

export async function checkAgentCooldown(
  agentId: string
): Promise<CooldownState> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { cooldownUntil: true, consecutiveLosses: true },
  });

  if (!agent) {
    return { inCooldown: false, consecutiveLosses: 0 };
  }

  return {
    inCooldown: isInCooldown(agent.cooldownUntil),
    cooldownUntil: agent.cooldownUntil || undefined,
    consecutiveLosses: agent.consecutiveLosses,
  };
}

// ---------------------------------------------------------------------------
// 5. Enforcement actions
// ---------------------------------------------------------------------------

async function lockAccount(userId: string, reason: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      riskLocked: true,
      riskLockedAt: new Date(),
      riskLockedReason: reason,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      type: "ALERT",
      message: `RISK: Account locked — ${reason}`,
    },
  });

  console.error(`[RISK ENGINE] Account locked for user ${userId}: ${reason}`);
}

async function stopAllAgents(userId: string): Promise<void> {
  const result = await prisma.agent.updateMany({
    where: { userId, status: { not: "STOPPED" } },
    data: { status: "STOPPED" },
  });

  if (result.count > 0) {
    await prisma.activityLog.create({
      data: {
        userId,
        type: "ALERT",
        message: `RISK: All ${result.count} agent(s) force-stopped due to risk breach.`,
      },
    });

    console.error(
      `[RISK ENGINE] Stopped ${result.count} agent(s) for user ${userId}`
    );
  }
}

/**
 * Unlock a user account. Called by admin or after review.
 */
export async function unlockAccount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      riskLocked: false,
      riskLockedAt: null,
      riskLockedReason: null,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      type: "INSIGHT",
      message: "Account unlocked — trading resumed.",
    },
  });
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function blocked(reason: string): RiskCheckResult {
  return { allowed: false, reason, warnings: [] };
}
