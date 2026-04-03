import { describe, it, expect } from "vitest";
import { calculateStats } from "../backtest/performance";
import type { BacktestTrade, EquityPoint } from "../backtest/performance";

function makeTrade(overrides: Partial<BacktestTrade> = {}): BacktestTrade {
  return {
    entryTime: 1000,
    exitTime: 2000,
    symbol: "BTC/USDT",
    side: "BUY",
    entryPrice: 100,
    exitPrice: 105,
    amount: 1,
    quoteSize: 100,
    pnl: 5,
    pnlPercent: 5,
    fees: 0.2,
    reason: "test",
    exitReason: "take-profit",
    ...overrides,
  };
}

describe("calculateStats", () => {
  it("calculates basic stats for winning trades", () => {
    const trades = [
      makeTrade({ pnl: 100, fees: 1 }),
      makeTrade({ pnl: 50, fees: 1 }),
      makeTrade({ pnl: -30, fees: 1 }),
    ];
    const equity: EquityPoint[] = [
      { timestamp: 0, equity: 10000, drawdown: 0 },
      { timestamp: 1000, equity: 10100, drawdown: 0 },
      { timestamp: 2000, equity: 10150, drawdown: 0 },
      { timestamp: 3000, equity: 10120, drawdown: -0.3 },
    ];

    const stats = calculateStats(trades, equity, 10000);

    expect(stats.totalTrades).toBe(3);
    expect(stats.winningTrades).toBe(2);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRate).toBeCloseTo(66.7, 0);
    expect(stats.netProfit).toBe(120);
    expect(stats.totalReturn).toBeCloseTo(1.2, 1);
    expect(stats.totalFees).toBe(3);
    expect(stats.largestWin).toBe(100);
    expect(stats.largestLoss).toBe(-30);
    expect(stats.avgWin).toBe(75);
    expect(stats.avgLoss).toBe(-30);
  });

  it("handles zero trades", () => {
    const equity: EquityPoint[] = [
      { timestamp: 0, equity: 10000, drawdown: 0 },
    ];
    const stats = calculateStats([], equity, 10000);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.expectancy).toBe(0);
  });

  it("calculates max drawdown", () => {
    const equity: EquityPoint[] = [
      { timestamp: 0, equity: 10000, drawdown: 0 },
      { timestamp: 1, equity: 9000, drawdown: -10 },
      { timestamp: 2, equity: 8500, drawdown: -15 },
      { timestamp: 3, equity: 9500, drawdown: -5 },
    ];

    const stats = calculateStats([], equity, 10000);
    expect(stats.maxDrawdown).toBe(-15);
  });

  it("calculates profit factor", () => {
    const trades = [
      makeTrade({ pnl: 100 }),
      makeTrade({ pnl: 200 }),
      makeTrade({ pnl: -50 }),
    ];
    const equity: EquityPoint[] = [
      { timestamp: 0, equity: 10000, drawdown: 0 },
      { timestamp: 3, equity: 10250, drawdown: 0 },
    ];

    const stats = calculateStats(trades, equity, 10000);
    expect(stats.profitFactor).toBe(6); // 300 / 50
  });
});
