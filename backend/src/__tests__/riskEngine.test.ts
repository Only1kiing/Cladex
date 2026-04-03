import { describe, it, expect } from "vitest";
import {
  checkDailyLoss,
  checkDrawdown,
} from "../risk/riskEngine";
import {
  calculatePositionSize,
  tradeRiskPercent,
  calculateStopLoss,
  calculateTakeProfitLevels,
  volatilityStopPercent,
  isInCooldown,
  cooldownDurationMs,
} from "../risk/riskUtils";
import type { PortfolioSnapshot, RiskConfig } from "../risk/riskTypes";

// ---------------------------------------------------------------------------
// riskUtils
// ---------------------------------------------------------------------------

describe("calculatePositionSize", () => {
  it("returns correct position size", () => {
    expect(calculatePositionSize(10000, 0.02)).toBe(200);
    expect(calculatePositionSize(10000, 0.05)).toBe(500);
  });

  it("returns 0 for zero/negative inputs", () => {
    expect(calculatePositionSize(0, 0.02)).toBe(0);
    expect(calculatePositionSize(-100, 0.02)).toBe(0);
    expect(calculatePositionSize(10000, 0)).toBe(0);
  });
});

describe("tradeRiskPercent", () => {
  it("calculates correct percentage", () => {
    expect(tradeRiskPercent(200, 10000)).toBeCloseTo(0.02);
    expect(tradeRiskPercent(500, 10000)).toBeCloseTo(0.05);
  });

  it("returns 1 (100%) when no balance", () => {
    expect(tradeRiskPercent(100, 0)).toBe(1);
  });
});

describe("calculateStopLoss", () => {
  it("places stop below entry for BUY", () => {
    const sl = calculateStopLoss(100, "BUY", 0.03);
    expect(sl).toBe(97);
  });

  it("places stop above entry for SELL", () => {
    const sl = calculateStopLoss(100, "SELL", 0.03);
    expect(sl).toBe(103);
  });
});

describe("calculateTakeProfitLevels", () => {
  it("returns 3 levels for BUY", () => {
    const levels = calculateTakeProfitLevels(100, "BUY");
    expect(levels).toHaveLength(3);
    expect(levels[0].percent).toBe(3);
    expect(levels[0].targetPrice).toBe(103);
    expect(levels[1].percent).toBe(5);
    expect(levels[2].percent).toBe(10);
    // Fractions sum to ~1
    const totalFraction = levels.reduce((s, l) => s + l.sellFraction, 0);
    expect(totalFraction).toBeCloseTo(1, 1);
  });

  it("targets lower prices for SELL", () => {
    const levels = calculateTakeProfitLevels(100, "SELL");
    expect(levels[0].targetPrice).toBe(97);
  });
});

describe("volatilityStopPercent", () => {
  it("returns 2% for majors", () => {
    expect(volatilityStopPercent("BTC/USDT")).toBe(0.02);
    expect(volatilityStopPercent("ETH/USDT")).toBe(0.02);
  });

  it("returns 3.5% for mid-caps", () => {
    expect(volatilityStopPercent("SOL/USDT")).toBe(0.035);
    expect(volatilityStopPercent("LINK/USDT")).toBe(0.035);
  });

  it("returns 5% for memecoins", () => {
    expect(volatilityStopPercent("DOGE/USDT")).toBe(0.05);
    expect(volatilityStopPercent("SHIB/USDT")).toBe(0.05);
  });
});

describe("isInCooldown", () => {
  it("returns false for null", () => {
    expect(isInCooldown(null)).toBe(false);
  });

  it("returns false for past date", () => {
    const past = new Date(Date.now() - 60000);
    expect(isInCooldown(past)).toBe(false);
  });

  it("returns true for future date", () => {
    const future = new Date(Date.now() + 60000);
    expect(isInCooldown(future)).toBe(true);
  });
});

describe("cooldownDurationMs", () => {
  it("returns 0 for < 3 losses", () => {
    expect(cooldownDurationMs(0)).toBe(0);
    expect(cooldownDurationMs(2)).toBe(0);
  });

  it("returns 30 min for 3 losses", () => {
    expect(cooldownDurationMs(3)).toBe(30 * 60 * 1000);
  });

  it("returns 1 hour for 6 losses", () => {
    expect(cooldownDurationMs(6)).toBe(60 * 60 * 1000);
  });

  it("returns 2 hours for 9+ losses", () => {
    expect(cooldownDurationMs(9)).toBe(120 * 60 * 1000);
    expect(cooldownDurationMs(15)).toBe(120 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// riskEngine checks
// ---------------------------------------------------------------------------

describe("checkDailyLoss", () => {
  const config: RiskConfig = {
    maxRiskPerTrade: 0.02,
    maxExposure: 0.20,
    dailyLossLimit: -0.08,
    maxDrawdown: -0.20,
  };

  it("allows trading when daily PnL is positive", () => {
    const portfolio: PortfolioSnapshot = {
      totalBalance: 10000,
      openExposure: 1000,
      dailyPnl: 500,
      peakBalance: 10000,
      currentDrawdown: 0,
    };
    const result = checkDailyLoss(portfolio, config);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("warns when approaching limit", () => {
    const portfolio: PortfolioSnapshot = {
      totalBalance: 10000,
      openExposure: 0,
      dailyPnl: -600, // -6%, within 60-100% of -8% limit
      peakBalance: 10000,
      currentDrawdown: -0.06,
    };
    const result = checkDailyLoss(portfolio, config);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Warning");
  });

  it("blocks when limit breached", () => {
    const portfolio: PortfolioSnapshot = {
      totalBalance: 10000,
      openExposure: 0,
      dailyPnl: -900, // -9% > -8% limit
      peakBalance: 10000,
      currentDrawdown: -0.09,
    };
    const result = checkDailyLoss(portfolio, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("breached");
  });
});

describe("checkDrawdown", () => {
  const config: RiskConfig = {
    maxRiskPerTrade: 0.02,
    maxExposure: 0.20,
    dailyLossLimit: -0.08,
    maxDrawdown: -0.20,
  };

  it("allows when no drawdown", () => {
    const portfolio: PortfolioSnapshot = {
      totalBalance: 10000,
      openExposure: 0,
      dailyPnl: 0,
      peakBalance: 10000,
      currentDrawdown: 0,
    };
    expect(checkDrawdown(portfolio, config).allowed).toBe(true);
  });

  it("blocks when drawdown exceeds max", () => {
    const portfolio: PortfolioSnapshot = {
      totalBalance: 7500,
      openExposure: 0,
      dailyPnl: 0,
      peakBalance: 10000,
      currentDrawdown: -0.25, // -25% > -20% limit
    };
    const result = checkDrawdown(portfolio, config);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("breached");
  });
});
