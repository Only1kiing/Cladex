'use client';

import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Shield,
  BarChart3,
  Target,
  Eye,
  Play,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

// ---- Types ----

interface BacktestStats {
  totalReturn: number;
  netProfit: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  profitFactor: number;
  avgTradeDuration: string;
  totalFees: number;
  expectancy: number;
}

interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
}

interface TradeEntry {
  entryTime: string;
  exitTime: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  reason: string;
  exitReason: string;
}

interface BacktestResult {
  stats: BacktestStats;
  equityCurve: EquityPoint[];
  trades: TradeEntry[];
  candleCount: number;
  executionTimeMs: number;
}

// ---- Constants ----

interface StrategyOption {
  id: string;
  name: string;
  apiKey: string;
  description: string;
  personality: 'nova' | 'sage' | 'apex' | 'echo';
  icon: React.ReactNode;
}

const STRATEGIES: StrategyOption[] = [
  {
    id: 'safeflow',
    name: 'SafeFlow',
    apiKey: 'safe_flow',
    description: 'Conservative DCA with smart entry points and capital preservation',
    personality: 'nova',
    icon: <Shield size={20} />,
  },
  {
    id: 'trendpro',
    name: 'TrendPro',
    apiKey: 'trend_pro',
    description: 'Trend-following using momentum indicators and breakout detection',
    personality: 'sage',
    icon: <BarChart3 size={20} />,
  },
  {
    id: 'beastmode',
    name: 'BeastMode',
    apiKey: 'beast_mode',
    description: 'Aggressive scalping with high-frequency entries and tight stops',
    personality: 'apex',
    icon: <Target size={20} />,
  },
  {
    id: 'dca',
    name: 'DCA',
    apiKey: 'dca',
    description: 'Systematic dollar-cost averaging across multiple timeframes',
    personality: 'echo',
    icon: <Eye size={20} />,
  },
];

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT'];
const TIMEFRAMES = ['1h', '4h', '1d'];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;

const PERSONALITY_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  nova: { text: 'text-nova-400', bg: 'bg-nova-500/10', border: 'border-nova-500/30', glow: 'shadow-nova-500/20' },
  sage: { text: 'text-sage-400', bg: 'bg-sage-500/10', border: 'border-sage-500/30', glow: 'shadow-sage-500/20' },
  apex: { text: 'text-apex-400', bg: 'bg-apex-500/10', border: 'border-apex-500/30', glow: 'shadow-apex-500/20' },
  echo: { text: 'text-echo-400', bg: 'bg-echo-500/10', border: 'border-echo-500/30', glow: 'shadow-echo-500/20' },
};

// ---- Helpers ----

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Component ----

export default function BacktestPage() {
  // Strategy selection
  const [selectedStrategy, setSelectedStrategy] = useState<string>('safeflow');

  // Config form
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-04-01');
  const [startingBalance, setStartingBalance] = useState(10000);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // State
  const [loading, setLoading] = useState(false);
  const [candleCount, setCandleCount] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeStrategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;

  const runBacktest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCandleCount(0);

    // Simulate candle count estimation for loading state
    const hours =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60);
    let estimated = 0;
    if (timeframe === '1h') estimated = Math.round(hours);
    else if (timeframe === '4h') estimated = Math.round(hours / 4);
    else estimated = Math.round(hours / 24);
    setCandleCount(estimated);

    try {
      const data = await api.post<BacktestResult>('/backtest/run', {
        strategy: activeStrategy.apiKey,
        symbol,
        timeframe,
        startDate,
        endDate,
        startingBalance,
        riskLevel,
      });
      setResult(data);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Backtest failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeStrategy, symbol, timeframe, startDate, endDate, startingBalance, riskLevel]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Strategy Backtester</h1>
          <p className="text-sm text-gray-400">
            Test trading strategies against historical data before going live
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertTriangle size={18} className="shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Strategy Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Select Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STRATEGIES.map((strategy) => {
              const isActive = selectedStrategy === strategy.id;
              const colors = PERSONALITY_COLORS[strategy.personality];
              return (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={[
                    'relative text-left p-4 rounded-xl border transition-all duration-300',
                    'hover:-translate-y-0.5 hover:shadow-lg',
                    isActive
                      ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
                      : 'border-[#1e1e2e] bg-[#111118] hover:border-white/10',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={isActive ? colors.text : 'text-gray-500'}>
                      {strategy.icon}
                    </span>
                    <span className="font-semibold text-sm text-white">{strategy.name}</span>
                    <Badge
                      variant={strategy.personality}
                      size="sm"
                    >
                      {strategy.personality.charAt(0).toUpperCase() + strategy.personality.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{strategy.description}</p>
                  {isActive && (
                    <div
                      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Form */}
        <Card padding="lg" className="bg-[#111118] border-[#1e1e2e]">
          <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <Activity size={16} className="text-[#B8FF3C]" />
            Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Symbol */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Trading Pair</label>
              <div className="relative">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full appearance-none bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-colors cursor-pointer"
                >
                  {SYMBOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Timeframe */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Timeframe</label>
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full appearance-none bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-colors cursor-pointer"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Starting Balance */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Starting Balance</label>
              <div className="relative">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="number"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(Number(e.target.value))}
                  min={100}
                  step={100}
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-colors"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-colors [color-scheme:dark]"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-colors [color-scheme:dark]"
              />
            </div>

            {/* Risk Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-400">Risk Level</label>
              <div className="flex gap-1.5">
                {RISK_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setRiskLevel(level)}
                    className={[
                      'flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
                      riskLevel === level
                        ? level === 'LOW'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : level === 'MEDIUM'
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-red-500/15 border-red-500/30 text-red-400'
                        : 'bg-[#0a0a0f] border-[#1e1e2e] text-gray-500 hover:text-gray-300 hover:border-white/10',
                    ].join(' ')}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              loading={loading}
              icon={<Play size={18} />}
              onClick={runBacktest}
              disabled={loading}
            >
              Run Backtest
            </Button>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card padding="lg" className="bg-[#111118] border-[#1e1e2e]">
            <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[#1e1e2e] border-t-[#B8FF3C] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity size={20} className="text-[#B8FF3C]" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">Running backtest...</p>
                <p className="text-xs text-gray-400">
                  Simulating {candleCount.toLocaleString()} candles on {symbol}
                </p>
              </div>
              <div className="w-48 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div className="h-full bg-[#B8FF3C]/60 rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          </Card>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Execution Info */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Completed in {(result.executionTimeMs / 1000).toFixed(2)}s
              </span>
              <span>{result.candleCount.toLocaleString()} candles processed</span>
              <span>
                {activeStrategy.name} on {symbol} ({timeframe})
              </span>
            </div>

            {/* Stats Grid — Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Return"
                value={formatPercent(result.stats.totalReturn)}
                positive={result.stats.totalReturn >= 0}
                icon={<TrendingUp size={16} />}
              />
              <StatCard
                label="Net Profit"
                value={formatCurrency(result.stats.netProfit)}
                positive={result.stats.netProfit >= 0}
                icon={<DollarSign size={16} />}
              />
              <StatCard
                label="Win Rate"
                value={`${result.stats.winRate.toFixed(1)}%`}
                positive={result.stats.winRate >= 50}
                icon={<Target size={16} />}
              />
              <StatCard
                label="Sharpe Ratio"
                value={result.stats.sharpeRatio.toFixed(2)}
                positive={result.stats.sharpeRatio >= 1}
                icon={<BarChart3 size={16} />}
              />
            </div>

            {/* Stats Grid — Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Max Drawdown"
                value={formatPercent(-Math.abs(result.stats.maxDrawdown))}
                positive={false}
                icon={<TrendingDown size={16} />}
              />
              <StatCard
                label="Total Trades"
                value={result.stats.totalTrades.toString()}
                neutral
                icon={<Activity size={16} />}
              />
              <StatCard
                label="Profit Factor"
                value={result.stats.profitFactor.toFixed(2)}
                positive={result.stats.profitFactor >= 1}
                icon={<BarChart3 size={16} />}
              />
              <StatCard
                label="Avg Duration"
                value={result.stats.avgTradeDuration}
                neutral
                icon={<Clock size={16} />}
              />
            </div>

            {/* Equity Curve Chart */}
            <Card padding="lg" className="bg-[#111118] border-[#1e1e2e]">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#B8FF3C]" />
                Equity Curve
              </h3>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={result.equityCurve}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 11 }}
                      axisLine={{ stroke: '#1e1e2e' }}
                    />
                    <YAxis
                      stroke="#444"
                      tick={{ fill: '#666', fontSize: 11 }}
                      axisLine={{ stroke: '#1e1e2e' }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(1)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111118',
                        border: '1px solid #1e1e2e',
                        borderRadius: '12px',
                        padding: '12px',
                      }}
                      labelStyle={{ color: '#999', fontSize: 12, marginBottom: 4 }}
                      labelFormatter={(val) => formatDate(val as string)}
                      formatter={(value: number, name: string) => {
                        if (name === 'equity') return [formatCurrency(value), 'Equity'];
                        if (name === 'drawdown')
                          return [formatPercent(-Math.abs(value)), 'Drawdown'];
                        return [value, name];
                      }}
                    />
                    <ReferenceLine
                      y={startingBalance}
                      stroke="#B8FF3C"
                      strokeDasharray="6 4"
                      strokeOpacity={0.3}
                      label={{
                        value: 'Start',
                        position: 'right',
                        fill: '#666',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="#B8FF3C"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#B8FF3C', stroke: '#0a0a0f', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="4 2"
                      dot={false}
                      activeDot={{ r: 3, fill: '#ef4444', stroke: '#0a0a0f', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Trade Log */}
            <Card padding="lg" className="bg-[#111118] border-[#1e1e2e]">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-[#B8FF3C]" />
                Trade Log
                <span className="text-xs text-gray-500 font-normal ml-1">
                  ({result.trades.length} trades)
                </span>
              </h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs min-w-[800px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#1e1e2e]">
                      <th className="text-left py-3 pr-3 font-medium">Entry Time</th>
                      <th className="text-left py-3 pr-3 font-medium">Exit Time</th>
                      <th className="text-left py-3 pr-3 font-medium">Side</th>
                      <th className="text-right py-3 pr-3 font-medium">Entry Price</th>
                      <th className="text-right py-3 pr-3 font-medium">Exit Price</th>
                      <th className="text-right py-3 pr-3 font-medium">PnL</th>
                      <th className="text-right py-3 pr-3 font-medium">PnL %</th>
                      <th className="text-right py-3 pr-3 font-medium">Fees</th>
                      <th className="text-left py-3 pr-3 font-medium">Reason</th>
                      <th className="text-left py-3 font-medium">Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.slice(0, 50).map((trade, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#1e1e2e]/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 pr-3 text-gray-300">
                          {formatDateTime(trade.entryTime)}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-300">
                          {formatDateTime(trade.exitTime)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={[
                              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                              trade.side.toLowerCase() === 'buy' || trade.side.toLowerCase() === 'long'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-red-500/15 text-red-400',
                            ].join(' ')}
                          >
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-300 font-mono">
                          {formatPrice(trade.entryPrice)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-300 font-mono">
                          {formatPrice(trade.exitPrice)}
                        </td>
                        <td
                          className={[
                            'py-2.5 pr-3 text-right font-mono font-medium',
                            trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                          ].join(' ')}
                        >
                          {trade.pnl >= 0 ? '+' : ''}
                          {formatCurrency(trade.pnl)}
                        </td>
                        <td
                          className={[
                            'py-2.5 pr-3 text-right font-mono',
                            trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400',
                          ].join(' ')}
                        >
                          {formatPercent(trade.pnlPercent)}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-gray-500 font-mono">
                          {formatCurrency(trade.fees)}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-400 max-w-[140px] truncate">
                          {trade.reason}
                        </td>
                        <td className="py-2.5 text-gray-400 max-w-[140px] truncate">
                          {trade.exitReason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.trades.length > 50 && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Showing 50 of {result.trades.length} trades
                  </p>
                )}
                {result.trades.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No trades were executed during this period.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

interface StatCardProps {
  label: string;
  value: string;
  positive?: boolean;
  neutral?: boolean;
  icon: React.ReactNode;
}

function StatCard({ label, value, positive, neutral, icon }: StatCardProps) {
  const valueColor = neutral
    ? 'text-white'
    : positive
    ? 'text-emerald-400'
    : 'text-red-400';

  return (
    <Card padding="md" className="bg-[#111118] border-[#1e1e2e] group hover:border-white/10 transition-all duration-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500 group-hover:text-gray-400 transition-colors">
          {icon}
        </span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono tracking-tight ${valueColor}`}>{value}</p>
    </Card>
  );
}
