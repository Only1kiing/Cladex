'use client';

import React, { useState } from 'react';
import {
  Shield, BarChart3, Target, Eye, Play, Pause, Square, MessageCircle,
  Send, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock,
  Calendar, Activity, MoreVertical, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import type { AgentPersonality, AgentStatus } from '@/types';

// ---- Types ----

interface RecentTrade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  price: number;
  pnl: number;
  pnlPercent: number;
  time: string;
}

interface UserAgent {
  id: string;
  name: string;
  personality: AgentPersonality;
  status: AgentStatus;
  pnl: number;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  createdAt: string;
  lastTradeAt: string;
  assets: string[];
  recentTrades: RecentTrade[];
}

// ---- Constants ----

const PERSONALITY_META: Record<AgentPersonality, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
}> = {
  guardian: {
    label: 'Guardian',
    icon: <Shield size={18} />,
    color: 'text-guardian-400',
    bgLight: 'bg-guardian-500/10',
  },
  analyst: {
    label: 'Analyst',
    icon: <BarChart3 size={18} />,
    color: 'text-analyst-400',
    bgLight: 'bg-analyst-500/10',
  },
  hunter: {
    label: 'Hunter',
    icon: <Target size={18} />,
    color: 'text-hunter-400',
    bgLight: 'bg-hunter-500/10',
  },
  oracle: {
    label: 'Oracle',
    icon: <Eye size={18} />,
    color: 'text-oracle-400',
    bgLight: 'bg-oracle-500/10',
  },
};

const STATUS_CONFIG: Record<AgentStatus, { label: string; dot: string; bg: string }> = {
  active: { label: 'Active', dot: 'bg-guardian-400 animate-pulse', bg: 'bg-guardian-500/10 text-guardian-400' },
  paused: { label: 'Paused', dot: 'bg-amber-400', bg: 'bg-amber-500/10 text-amber-400' },
  stopped: { label: 'Stopped', dot: 'bg-gray-500', bg: 'bg-gray-500/10 text-gray-400' },
  error: { label: 'Error', dot: 'bg-hunter-400', bg: 'bg-hunter-500/10 text-hunter-400' },
};

// ---- Mock Data ----

const MOCK_AGENTS: UserAgent[] = [
  {
    id: '1',
    name: 'Safe Harbor Bot',
    personality: 'guardian',
    status: 'active',
    pnl: 1247.83,
    pnlPercent: 4.2,
    totalTrades: 156,
    winRate: 82,
    createdAt: '2025-12-15',
    lastTradeAt: '2 hours ago',
    assets: ['BTC', 'ETH'],
    recentTrades: [
      { id: 't1', pair: 'BTC/USDT', type: 'buy', price: 67432.50, pnl: 124.30, pnlPercent: 1.8, time: '2 hours ago' },
      { id: 't2', pair: 'ETH/USDT', type: 'sell', price: 3521.20, pnl: 89.50, pnlPercent: 2.5, time: '5 hours ago' },
      { id: 't3', pair: 'BTC/USDT', type: 'buy', price: 66890.00, pnl: -32.10, pnlPercent: -0.5, time: '1 day ago' },
    ],
  },
  {
    id: '2',
    name: 'Alpha Predator',
    personality: 'hunter',
    status: 'active',
    pnl: 4521.67,
    pnlPercent: 15.3,
    totalTrades: 892,
    winRate: 56,
    createdAt: '2026-01-08',
    lastTradeAt: '15 minutes ago',
    assets: ['SOL', 'AVAX', 'LINK'],
    recentTrades: [
      { id: 't4', pair: 'SOL/USDT', type: 'buy', price: 187.30, pnl: 342.80, pnlPercent: 5.2, time: '15 min ago' },
      { id: 't5', pair: 'AVAX/USDT', type: 'sell', price: 42.15, pnl: -87.20, pnlPercent: -2.1, time: '1 hour ago' },
      { id: 't6', pair: 'LINK/USDT', type: 'buy', price: 18.92, pnl: 156.40, pnlPercent: 3.8, time: '3 hours ago' },
    ],
  },
  {
    id: '3',
    name: 'Crystal Vision',
    personality: 'oracle',
    status: 'paused',
    pnl: 2890.45,
    pnlPercent: 9.1,
    totalTrades: 423,
    winRate: 71,
    createdAt: '2026-02-01',
    lastTradeAt: '3 days ago',
    assets: ['BTC', 'ETH', 'SOL', 'DOT'],
    recentTrades: [
      { id: 't7', pair: 'BTC/USDT', type: 'sell', price: 68100.00, pnl: 521.30, pnlPercent: 3.2, time: '3 days ago' },
      { id: 't8', pair: 'DOT/USDT', type: 'buy', price: 8.45, pnl: 45.60, pnlPercent: 1.9, time: '4 days ago' },
      { id: 't9', pair: 'ETH/USDT', type: 'sell', price: 3480.50, pnl: -67.80, pnlPercent: -1.2, time: '5 days ago' },
    ],
  },
  {
    id: '4',
    name: 'Data Cruncher',
    personality: 'analyst',
    status: 'active',
    pnl: 1832.21,
    pnlPercent: 6.5,
    totalTrades: 567,
    winRate: 65,
    createdAt: '2026-01-20',
    lastTradeAt: '45 minutes ago',
    assets: ['BTC', 'ETH', 'SOL'],
    recentTrades: [
      { id: 't10', pair: 'ETH/USDT', type: 'buy', price: 3498.70, pnl: 178.90, pnlPercent: 2.8, time: '45 min ago' },
      { id: 't11', pair: 'BTC/USDT', type: 'sell', price: 67800.00, pnl: 234.50, pnlPercent: 1.5, time: '6 hours ago' },
      { id: 't12', pair: 'SOL/USDT', type: 'buy', price: 182.40, pnl: -45.30, pnlPercent: -0.8, time: '1 day ago' },
    ],
  },
];

// ---- Mock AI Ask responses ----

function getMockAskResponse(agentName: string, question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes('why') && lower.includes('buy')) {
    return `I identified a bullish divergence on the RSI combined with increasing volume. The price was sitting at a key support level that has held 4 times in the past month. My confidence score was 78%, well above the 65% threshold I use for entries.`;
  }
  if (lower.includes('why') && lower.includes('sell')) {
    return `The position hit my take-profit target of 3.2%. Additionally, I detected bearish momentum building on the 4-hour chart with the MACD crossing below the signal line. Locking in profits was the optimal move.`;
  }
  if (lower.includes('performance') || lower.includes('how are you')) {
    return `I'm performing within expected parameters. My win rate is slightly above my 30-day average, and I've been particularly effective at identifying support/resistance levels this week. Risk management has kept my max drawdown at 2.1%.`;
  }
  if (lower.includes('next') || lower.includes('plan')) {
    return `I'm currently monitoring 3 potential setups: a bull flag on BTC/USDT at the 4-hour timeframe, a breakout forming on ETH near $3,550, and accumulation signals on SOL. I'll wait for my confirmation indicators before entering.`;
  }
  return `Based on my analysis of current market conditions, I'm monitoring several key levels and waiting for high-probability setups. My strategy parameters are optimized for the current volatility regime.`;
}

// ---- Agent Card Component ----

function AgentCardExpanded({ agent }: { agent: UserAgent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<AgentStatus>(agent.status);
  const [askInput, setAskInput] = useState('');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  const meta = PERSONALITY_META[agent.personality];
  const statusCfg = STATUS_CONFIG[status];
  const isPositive = agent.pnl >= 0;

  function handleAsk() {
    const text = askInput.trim();
    if (!text || isAsking) return;
    setIsAsking(true);
    setAskResponse(null);

    setTimeout(() => {
      setAskResponse(getMockAskResponse(agent.name, text));
      setIsAsking(false);
    }, 1200);
  }

  function handleStatusChange(newStatus: AgentStatus) {
    setStatus(newStatus);
  }

  return (
    <div className="bg-[#111118] rounded-2xl border border-[#1e1e2e] overflow-hidden transition-all duration-300 hover:border-[#2e2e3e]">
      {/* Main card content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Left: identity */}
          <div className="flex items-center gap-3">
            <AgentAvatar personality={agent.personality} size={56} active={status === 'active'} />
            <div>
              <h3 className="text-base font-bold text-white">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={agent.personality} size="sm">{meta.label}</Badge>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${statusCfg.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right: PnL */}
          <div className="text-right">
            <div className={`text-lg font-bold ${isPositive ? 'text-guardian-400' : 'text-hunter-400'}`}>
              {isPositive ? '+' : ''}{agent.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
            <div className={`text-xs ${isPositive ? 'text-guardian-400' : 'text-hunter-400'}`}>
              {isPositive ? '+' : ''}{agent.pnlPercent}%
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5">Trades</div>
            <div className="text-sm font-semibold text-white">{agent.totalTrades}</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5">Win Rate</div>
            <div className="text-sm font-semibold text-white">{agent.winRate}%</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Calendar size={8} /> Created</div>
            <div className="text-sm font-semibold text-white">{new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Clock size={8} /> Last</div>
            <div className="text-sm font-semibold text-white">{agent.lastTradeAt}</div>
          </div>
        </div>

        {/* Assets */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Assets:</span>
          {agent.assets.map((a) => (
            <span key={a} className="px-2 py-0.5 rounded-md bg-[#0a0a0f] border border-[#2a2a3a] text-[10px] text-gray-400 font-medium">
              {a}
            </span>
          ))}
        </div>

        {/* Bottom actions bar */}
        <div className="flex items-center justify-between">
          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {status !== 'active' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-guardian-400 bg-guardian-500/10 hover:bg-guardian-500/20 border border-guardian-500/20 transition-all"
              >
                <Play size={12} /> Start
              </button>
            )}
            {status === 'active' && (
              <button
                onClick={() => handleStatusChange('paused')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
              >
                <Pause size={12} /> Pause
              </button>
            )}
            {status !== 'stopped' && (
              <button
                onClick={() => handleStatusChange('stopped')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 transition-all"
              >
                <Square size={12} /> Stop
              </button>
            )}
            <button
              onClick={() => { setShowAsk(!showAsk); setAskResponse(null); }}
              className={[
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                showAsk
                  ? 'text-[#B8FF3C] bg-[#B8FF3C]/10 border-[#B8FF3C]/20'
                  : 'text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20',
              ].join(' ')}
            >
              <MessageCircle size={12} /> Ask Agent
            </button>
          </div>

          {/* Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isExpanded ? 'Hide Trades' : 'Show Trades'}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Ask Agent section */}
      {showAsk && (
        <div className="px-5 pb-4 border-t border-[#1e1e2e]">
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#B8FF3C]" />
              <span className="text-xs font-medium text-[#B8FF3C]">Ask {agent.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
                placeholder={`e.g. "Why did you buy ETH?"`}
                className="flex-1 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-[#B8FF3C]/50 transition-all"
              />
              <Button size="sm" onClick={handleAsk} disabled={!askInput.trim() || isAsking} icon={<Send size={12} />}>
                Ask
              </Button>
            </div>
            {isAsking && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            {askResponse && (
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={10} className="text-[#B8FF3C]" />
                  <span className="text-[10px] font-medium text-[#B8FF3C]">{agent.name}</span>
                </div>
                {askResponse}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded: Recent Trades */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[#1e1e2e]">
          <div className="pt-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Trades</h4>
            <div className="space-y-2">
              {agent.recentTrades.map((trade) => {
                const isBuy = trade.type === 'buy';
                const isProfit = trade.pnl >= 0;
                return (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3.5 py-2.5 border border-[#1e1e2e]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isBuy ? 'bg-guardian-500/10' : 'bg-hunter-500/10'}`}>
                        {isBuy ? <TrendingUp size={14} className="text-guardian-400" /> : <TrendingDown size={14} className="text-hunter-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{trade.pair}</span>
                          <span className={`text-[10px] font-medium uppercase ${isBuy ? 'text-guardian-400' : 'text-hunter-400'}`}>
                            {trade.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">${trade.price.toLocaleString()} &middot; {trade.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${isProfit ? 'text-guardian-400' : 'text-hunter-400'}`}>
                        {isProfit ? '+' : ''}{trade.pnl.toFixed(2)}
                      </div>
                      <div className={`text-[10px] ${isProfit ? 'text-guardian-400' : 'text-hunter-400'}`}>
                        {isProfit ? '+' : ''}{trade.pnlPercent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function MyAgentsPage() {
  const totalPnl = MOCK_AGENTS.reduce((sum, a) => sum + a.pnl, 0);
  const totalTrades = MOCK_AGENTS.reduce((sum, a) => sum + a.totalTrades, 0);
  const activeCount = MOCK_AGENTS.filter((a) => a.status === 'active').length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">My Agents</h1>
              <p className="text-sm text-gray-500">Manage and interact with your trading agents</p>
            </div>
            <Button icon={<Activity size={16} />} size="md">
              Build New Agent
            </Button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
              <div className="text-xs text-gray-500 mb-1">Total Agents</div>
              <div className="text-xl font-bold text-white">{MOCK_AGENTS.length}</div>
            </div>
            <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
              <div className="text-xs text-gray-500 mb-1">Active</div>
              <div className="text-xl font-bold text-guardian-400">{activeCount}</div>
            </div>
            <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
              <div className="text-xs text-gray-500 mb-1">Total P&L</div>
              <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-guardian-400' : 'text-hunter-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
            <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
              <div className="text-xs text-gray-500 mb-1">Total Trades</div>
              <div className="text-xl font-bold text-white">{totalTrades.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {MOCK_AGENTS.map((agent) => (
            <AgentCardExpanded key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
