// ---------------------------------------------------------------------------
// Backtest performance metrics — institutional-grade statistics
// ---------------------------------------------------------------------------

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  amount: number;
  quoteSize: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  reason: string;
  exitReason: string;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;     // negative %
}

export interface BacktestStats {
  totalReturn: number;         // %
  netProfit: number;           // $
  startingBalance: number;
  endingBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;             // %
  avgWin: number;              // $
  avgLoss: number;             // $
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;         // negative %
  maxDrawdownDuration: number; // ms
  sharpeRatio: number;
  profitFactor: number;        // gross profit / gross loss
  avgTradeDuration: number;    // ms
  totalFees: number;
  expectancy: number;          // avg $ per trade
}

export function calculateStats(
  trades: BacktestTrade[],
  equityCurve: EquityPoint[],
  startingBalance: number
): BacktestStats {
  const endingBalance = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1].equity
    : startingBalance;

  const netProfit = endingBalance - startingBalance;
  const totalReturn = startingBalance > 0
    ? ((endingBalance - startingBalance) / startingBalance) * 100
    : 0;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const totalFees = trades.reduce((s, t) => s + t.fees, 0);

  // Max drawdown
  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  let ddStart = 0;

  for (const p of equityCurve) {
    if (p.drawdown < maxDrawdown) {
      maxDrawdown = p.drawdown;
    }
    if (p.drawdown < 0 && ddStart === 0) {
      ddStart = p.timestamp;
    }
    if (p.drawdown >= 0 && ddStart > 0) {
      const duration = p.timestamp - ddStart;
      if (duration > maxDrawdownDuration) maxDrawdownDuration = duration;
      ddStart = 0;
    }
  }
  // If still in drawdown at end
  if (ddStart > 0 && equityCurve.length > 0) {
    const duration = equityCurve[equityCurve.length - 1].timestamp - ddStart;
    if (duration > maxDrawdownDuration) maxDrawdownDuration = duration;
  }

  // Sharpe ratio (annualized)
  // Using daily returns if we have equity curve
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    if (prev > 0) {
      returns.push((equityCurve[i].equity - prev) / prev);
    }
  }

  let sharpeRatio = 0;
  if (returns.length > 1) {
    const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      // Annualize: assume ~252 trading days worth of data points
      // Scale based on how many data points we have per year
      const periodsPerYear = Math.min(returns.length * (365 / Math.max(1, (equityCurve[equityCurve.length - 1].timestamp - equityCurve[0].timestamp) / 86400000)), 8760);
      sharpeRatio = (meanReturn / stdDev) * Math.sqrt(periodsPerYear);
    }
  }

  // Average trade duration
  const durations = trades.map((t) => t.exitTime - t.entryTime);
  const avgDuration = durations.length > 0
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : 0;

  return {
    totalReturn: round(totalReturn, 2),
    netProfit: round(netProfit, 2),
    startingBalance,
    endingBalance: round(endingBalance, 2),
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: trades.length > 0 ? round((wins.length / trades.length) * 100, 1) : 0,
    avgWin: wins.length > 0 ? round(grossProfit / wins.length, 2) : 0,
    avgLoss: losses.length > 0 ? round(-grossLoss / losses.length, 2) : 0,
    largestWin: wins.length > 0 ? round(Math.max(...wins.map((t) => t.pnl)), 2) : 0,
    largestLoss: losses.length > 0 ? round(Math.min(...losses.map((t) => t.pnl)), 2) : 0,
    maxDrawdown: round(maxDrawdown, 2),
    maxDrawdownDuration,
    sharpeRatio: round(sharpeRatio, 2),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 2) : grossProfit > 0 ? Infinity : 0,
    avgTradeDuration: Math.round(avgDuration),
    totalFees: round(totalFees, 2),
    expectancy: trades.length > 0 ? round(netProfit / trades.length, 2) : 0,
  };
}

function round(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
