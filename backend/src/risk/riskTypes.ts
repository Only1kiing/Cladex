// ---------------------------------------------------------------------------
// Risk Engine — Type definitions
// ---------------------------------------------------------------------------

export interface RiskConfig {
  maxRiskPerTrade: number;   // e.g. 0.02 = 2%
  maxExposure: number;       // e.g. 0.20 = 20%
  dailyLossLimit: number;    // e.g. -0.08 = -8%
  maxDrawdown: number;       // e.g. -0.20 = -20%
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxRiskPerTrade: 0.02,
  maxExposure: 0.20,
  dailyLossLimit: -0.08,
  maxDrawdown: -0.20,
};

export interface TradeRequest {
  userId: string;
  agentId?: string;
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;          // base asset quantity
  price: number;           // entry price
  quoteAmount?: number;    // USD value of the trade
  stopLoss?: number;
  takeProfit?: number;
  reason?: string;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  adjustedAmount?: number;          // risk engine may reduce size
  adjustedStopLoss?: number;
  takeProfitLevels?: TakeProfitLevel[];
  riskPercent?: number;             // what % of balance this trade uses
  warnings: string[];
}

export interface TakeProfitLevel {
  percent: number;        // +3%, +5%, +10%
  sellFraction: number;   // fraction of position to sell (0.33, 0.33, 0.34)
  targetPrice: number;    // computed target price
}

export interface PortfolioSnapshot {
  totalBalance: number;
  openExposure: number;     // USD value of all open positions
  dailyPnl: number;         // PnL in last 24 hours
  peakBalance: number;
  currentDrawdown: number;  // negative number representing % from peak
}

export interface CooldownState {
  inCooldown: boolean;
  cooldownUntil?: Date;
  consecutiveLosses: number;
}

export type RiskDecision =
  | { type: "TRADE_BLOCKED"; reason: string }
  | { type: "AGENT_PAUSED"; agentId: string; reason: string }
  | { type: "ACCOUNT_LOCKED"; userId: string; reason: string }
  | { type: "POSITION_REDUCED"; originalAmount: number; adjustedAmount: number; reason: string }
  | { type: "TRADE_APPROVED"; warnings: string[] };
