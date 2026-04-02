// ---------------------------------------------------------------------------
// Backtest Engine — simulates strategy execution on historical data
// ---------------------------------------------------------------------------
//
// For each candle window, feeds data into the strategy, simulates trade
// execution with fees/slippage, enforces stop-loss and take-profit,
// tracks equity curve and trade log.
// ---------------------------------------------------------------------------

import type { Candle } from "./indicators";
import type { BacktestSignal } from "./strategies";
import type { BacktestTrade, EquityPoint, BacktestStats } from "./performance";
import { getStrategy } from "./strategies";
import { fetchHistoricalData, type Timeframe } from "./dataLoader";
import { calculateStats } from "./performance";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacktestConfig {
  strategy: string;
  symbol: string;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  startingBalance: number;
  riskLevel: string;
  exchange?: string;

  // Simulation params
  positionSizePercent?: number;  // % of balance per trade (default 3%)
  maxExposurePercent?: number;   // max % in open positions (default 20%)
  feePercent?: number;           // trading fee per side (default 0.1%)
  slippagePercent?: number;      // slippage (default 0.05%)
}

export interface BacktestResult {
  config: BacktestConfig;
  stats: BacktestStats;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  candleCount: number;
  executionTimeMs: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface OpenPosition {
  entryTime: number;
  side: "BUY" | "SELL";
  entryPrice: number;
  amount: number;
  quoteSize: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  entryFee: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const startTime = Date.now();

  // Validate strategy
  const strategyFn = getStrategy(config.strategy);
  if (!strategyFn) {
    throw new Error(`Unknown strategy: ${config.strategy}. Available: safeflow, trend_pro, beast_mode, dca`);
  }

  // Validate balance
  if (config.startingBalance <= 0) {
    throw new Error("startingBalance must be positive");
  }

  // Defaults
  const positionPct = (config.positionSizePercent ?? 3) / 100;
  const maxExposurePct = (config.maxExposurePercent ?? 20) / 100;
  const feePct = (config.feePercent ?? 0.1) / 100;
  const slippagePct = (config.slippagePercent ?? 0.05) / 100;

  // Fetch historical data
  const candles = await fetchHistoricalData({
    symbol: config.symbol,
    timeframe: config.timeframe,
    startDate: config.startDate,
    endDate: config.endDate,
    exchange: config.exchange,
  });

  if (candles.length < 30) {
    throw new Error(`Not enough data: got ${candles.length} candles, need at least 30`);
  }

  // Simulation state
  let balance = config.startingBalance;
  let peakEquity = balance;
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const openPositions: OpenPosition[] = [];

  // Strategy needs a lookback window — we feed it the last N candles
  const lookback = config.strategy === "safeflow" ? 210 : 60;

  // Main loop — iterate candle by candle
  for (let i = lookback; i < candles.length; i++) {
    const currentCandle = candles[i];
    const window = candles.slice(Math.max(0, i - lookback), i + 1);
    const price = currentCandle.close;

    // ---- Check stop-loss and take-profit on open positions ----
    const closedIndices: number[] = [];
    for (let p = 0; p < openPositions.length; p++) {
      const pos = openPositions[p];
      let exitPrice: number | null = null;
      let exitReason = "";

      if (pos.side === "BUY") {
        // Check stop-loss (hit if low <= stopLoss)
        if (currentCandle.low <= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = "stop-loss";
        }
        // Check take-profit (hit if high >= takeProfit)
        else if (currentCandle.high >= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = "take-profit";
        }
      } else {
        // SHORT
        if (currentCandle.high >= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = "stop-loss";
        } else if (currentCandle.low <= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = "take-profit";
        }
      }

      if (exitPrice !== null) {
        // Apply slippage on exit
        const slippage = exitPrice * slippagePct;
        exitPrice = pos.side === "BUY"
          ? exitPrice - slippage  // worse for longs
          : exitPrice + slippage; // worse for shorts

        const exitFee = pos.amount * exitPrice * feePct;
        const grossPnl = pos.side === "BUY"
          ? (exitPrice - pos.entryPrice) * pos.amount
          : (pos.entryPrice - exitPrice) * pos.amount;
        const netPnl = grossPnl - pos.entryFee - exitFee;

        balance += pos.quoteSize + netPnl;

        trades.push({
          entryTime: pos.entryTime,
          exitTime: currentCandle.timestamp,
          symbol: config.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice,
          amount: pos.amount,
          quoteSize: pos.quoteSize,
          pnl: Math.round(netPnl * 100) / 100,
          pnlPercent: pos.quoteSize > 0 ? Math.round((netPnl / pos.quoteSize) * 10000) / 100 : 0,
          fees: Math.round((pos.entryFee + exitFee) * 100) / 100,
          reason: pos.reason,
          exitReason,
        });

        closedIndices.push(p);
      }
    }

    // Remove closed positions (reverse order to preserve indices)
    for (let c = closedIndices.length - 1; c >= 0; c--) {
      openPositions.splice(closedIndices[c], 1);
    }

    // ---- Evaluate strategy ----
    const signal = strategyFn(window, config.riskLevel);

    if (signal.action !== "HOLD" && balance > 0) {
      // Check exposure limit
      const currentExposure = openPositions.reduce((s, p) => s + p.quoteSize, 0);
      const totalEquity = balance + currentExposure;
      const maxExposure = totalEquity * maxExposurePct;

      if (currentExposure < maxExposure) {
        // Calculate position size
        const rawSize = totalEquity * positionPct * signal.sizeMultiplier;
        const availableSize = Math.min(rawSize, balance * 0.95, maxExposure - currentExposure);

        if (availableSize > 1) { // min $1 trade
          // Apply slippage on entry
          const slippage = price * slippagePct;
          const entryPrice = signal.action === "BUY"
            ? price + slippage  // worse for longs
            : price - slippage; // worse for shorts

          const amount = availableSize / entryPrice;
          const entryFee = amount * entryPrice * feePct;
          const quoteSize = availableSize;

          // Calculate stop-loss and take-profit prices
          const stopLoss = signal.action === "BUY"
            ? entryPrice * (1 - signal.stopLossPercent / 100)
            : entryPrice * (1 + signal.stopLossPercent / 100);

          const takeProfit = signal.action === "BUY"
            ? entryPrice * (1 + signal.takeProfitPercent / 100)
            : entryPrice * (1 - signal.takeProfitPercent / 100);

          // Deduct from balance
          balance -= quoteSize;

          openPositions.push({
            entryTime: currentCandle.timestamp,
            side: signal.action,
            entryPrice,
            amount,
            quoteSize,
            stopLoss,
            takeProfit,
            reason: signal.reason,
            entryFee,
          });
        }
      }
    }

    // ---- Record equity ----
    const openValue = openPositions.reduce((s, pos) => {
      const unrealized = pos.side === "BUY"
        ? (price - pos.entryPrice) * pos.amount
        : (pos.entryPrice - price) * pos.amount;
      return s + pos.quoteSize + unrealized;
    }, 0);

    const totalEquity = balance + openValue;
    if (totalEquity > peakEquity) peakEquity = totalEquity;

    const drawdown = peakEquity > 0
      ? ((totalEquity - peakEquity) / peakEquity) * 100
      : 0;

    // Sample equity curve (every Nth candle to keep output manageable)
    const sampleRate = candles.length > 2000 ? 10 : candles.length > 500 ? 5 : 1;
    if (i % sampleRate === 0 || i === candles.length - 1) {
      equityCurve.push({
        timestamp: currentCandle.timestamp,
        equity: Math.round(totalEquity * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }
  }

  // Force-close any remaining open positions at last candle price
  const lastPrice = candles[candles.length - 1].close;
  for (const pos of openPositions) {
    const exitFee = pos.amount * lastPrice * feePct;
    const grossPnl = pos.side === "BUY"
      ? (lastPrice - pos.entryPrice) * pos.amount
      : (pos.entryPrice - lastPrice) * pos.amount;
    const netPnl = grossPnl - pos.entryFee - exitFee;

    balance += pos.quoteSize + netPnl;

    trades.push({
      entryTime: pos.entryTime,
      exitTime: candles[candles.length - 1].timestamp,
      symbol: config.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: lastPrice,
      amount: pos.amount,
      quoteSize: pos.quoteSize,
      pnl: Math.round(netPnl * 100) / 100,
      pnlPercent: pos.quoteSize > 0 ? Math.round((netPnl / pos.quoteSize) * 10000) / 100 : 0,
      fees: Math.round((pos.entryFee + exitFee) * 100) / 100,
      reason: pos.reason,
      exitReason: "backtest-end",
    });
  }

  // Final equity point
  if (equityCurve.length === 0 || equityCurve[equityCurve.length - 1].timestamp !== candles[candles.length - 1].timestamp) {
    const finalEquity = balance;
    equityCurve.push({
      timestamp: candles[candles.length - 1].timestamp,
      equity: Math.round(finalEquity * 100) / 100,
      drawdown: peakEquity > 0 ? Math.round(((finalEquity - peakEquity) / peakEquity) * 10000) / 100 : 0,
    });
  }

  const stats = calculateStats(trades, equityCurve, config.startingBalance);
  const executionTimeMs = Date.now() - startTime;

  return {
    config,
    stats,
    equityCurve,
    trades,
    candleCount: candles.length,
    executionTimeMs,
  };
}
