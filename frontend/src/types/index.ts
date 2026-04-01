// ---- Enums ----

export type AgentPersonality = 'nova' | 'apex' | 'sage' | 'echo';

export type AgentStatus = 'active' | 'paused' | 'stopped' | 'error';

export type TradeType = 'buy' | 'sell';

export type TradeSide = 'long' | 'short';

export type TradeStatus = 'open' | 'closed' | 'pending' | 'cancelled';

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';

export type ExchangeId = 'binance' | 'coinbase' | 'kraken' | 'bybit' | 'okx';

// ---- User ----

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Agent ----

export interface AgentConfig {
  riskTolerance: number;       // 0-100
  maxPositionSize: number;     // percentage of portfolio
  stopLossPercent: number;
  takeProfitPercent: number;
  tradingPairs: string[];      // e.g. ['BTC/USDT', 'ETH/USDT']
  exchangeId: ExchangeId;
  strategy?: string;
  maxDailyTrades?: number;
  cooldownMinutes?: number;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  personality: AgentPersonality;
  status: AgentStatus;
  config: AgentConfig;
  pnl: number;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
  lastTradeAt?: string;
}

// ---- Trade ----

export interface Trade {
  id: string;
  agentId: string;
  agentName: string;
  agentPersonality: AgentPersonality;
  pair: string;
  type: TradeType;
  side: TradeSide;
  orderType: OrderType;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  fee?: number;
  exchangeId: ExchangeId;
  reason?: string;
  openedAt: string;
  closedAt?: string;
}

// ---- Exchange ----

export interface Exchange {
  id: ExchangeId;
  name: string;
  connected: boolean;
  apiKeySet: boolean;
  balance?: number;
  lastSynced?: string;
}

// ---- Activity Log ----

export interface ActivityLog {
  id: string;
  agentId?: string;
  agentName?: string;
  agentPersonality?: AgentPersonality;
  type: 'trade' | 'signal' | 'alert' | 'system' | 'error';
  message: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  totalBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  winRate: number;
  activeAgents: number;
  totalAgents: number;
  todayPnl: number;
  todayTrades: number;
  bestAgent?: {
    name: string;
    personality: AgentPersonality;
    pnlPercent: number;
  };
  portfolioHistory: {
    timestamp: string;
    value: number;
  }[];
  personalityBreakdown: {
    personality: AgentPersonality;
    pnl: number;
    trades: number;
    winRate: number;
  }[];
}

// ---- API Response wrappers ----

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
