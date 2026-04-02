'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { getDeployedAgents, updateAgentStatus } from '@/lib/agents-store';
import type { DeployedAgent } from '@/lib/agents-store';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { api } from '@/lib/api';

import { Badge } from '@/components/ui/Badge';
import { ReferralCard } from '@/components/dashboard/PointsSystem';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import type { AgentPersonality } from '@/types';
import type { ActivityItem } from '@/components/dashboard/ActivityFeed';

// Dashboard stats shape from API
interface DashboardStats {
  totalBalance: number;
  totalProfit: number;
  activeAgents: number;
  totalTrades: number;
}

// ---- Icons ----

function BalanceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5v15M5.25 4.5h5.625a2.625 2.625 0 010 5.25H5.25M5.25 9.75h6.375a2.625 2.625 0 010 5.25H5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PnlIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2.25 12.75l4.5-4.5 3 3 6-7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.75 3.75h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="2.5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="6.5" r="1" fill="currentColor" />
      <circle cx="11" cy="6.5" r="1" fill="currentColor" />
      <path d="M6.5 15l1-3.5h3l1 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TradesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 13.5V4.5M7.5 13.5V7.5M12 13.5V10.5M16.5 13.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

// ---- Chat Message Types ----

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ---- Exchange options ----

const exchanges = [
  { id: 'bybit', name: 'Bybit', letter: 'BY', color: '#F7A600' },
  { id: 'binance', name: 'Binance', letter: 'B', color: '#F0B90B' },
] as const;

// ---- Typing indicator ----

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-[#B8FF3C]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-[#B8FF3C]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-[#B8FF3C]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// ---- Shared Chat Component ----

function ChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isTyping,
  messagesEndRef,
  messagesContainerRef,
  className = '',
  inputPlaceholder = 'Ask Cladex AI anything...',
}: {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  inputPlaceholder?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Messages */}
      <div ref={messagesContainerRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={[
              'max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-gray-100'
                : 'bg-white/[0.04] border border-white/[0.06] text-gray-300',
            ].join(' ')}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">Thinking</span>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder={inputPlaceholder}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
          />
          <button
            onClick={onSend}
            disabled={!inputValue.trim() || isTyping}
            className="w-10 h-10 rounded-xl bg-[#B8FF3C] flex items-center justify-center text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Signal Section (show 1, expand for more) ----

// ==============================================================
// DASHBOARD PAGE
// ==============================================================

export default function DashboardPage() {
  const [exchangeConnected, setExchangeConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('cladex_demo_mode') === 'true') return false;
    return localStorage.getItem('cladex_exchange_connected') === 'true';
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [connectingState, setConnectingState] = useState<'idle' | 'connecting' | 'success'>('idle');
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);

  const [deployedAgents, setDeployedAgents] = useState<DeployedAgent[]>([]);
  const [showAllTrades, setShowAllTrades] = useState(false);

  // Real data from backend API
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [exchangeBalance, setExchangeBalance] = useState<{ total: number; balances: { asset: string; free: number; total: number; usdValue?: number }[] }>({ total: 0, balances: [] });
  const [tradeLogItems, setTradeLogItems] = useState<ActivityItem[]>([]);
  const [agentComms, setAgentComms] = useState<{ id: string; agentName: string; personality: string; message: string; type: string; timestamp: string }[]>([]);

  // Real signals from backend
  const [liveSignals, setLiveSignals] = useState<{
    id: string;
    symbol: string;
    side: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    reason: string;
    expiresAt: string;
    agent: { id: string; name: string; personality: string };
  }[]>([]);
  const [executingTrade, setExecutingTrade] = useState<string | null>(null);


  // Load deployed agents
  useEffect(() => {
    const refresh = () => setDeployedAgents(getDeployedAgents());
    refresh();
    window.addEventListener('cladex_agents_updated', refresh);
    return () => window.removeEventListener('cladex_agents_updated', refresh);
  }, []);

  // Simulate pending agents going active after 30s (same as agents page)
  useEffect(() => {
    const pending = deployedAgents.filter(a => a.status === 'pending');
    if (pending.length === 0) return;
    const timeout = setTimeout(() => {
      pending.forEach(a => updateAgentStatus(a.id, 'active'));
    }, 30000);
    return () => clearTimeout(timeout);
  }, [deployedAgents]);

  // Fetch dashboard data from backend
  const fetchDashboardData = useCallback(async () => {
    // Fetch dashboard stats + exchange balance
    try {
      const data = await api.get<{ stats: DashboardStats; exchangeConnected?: boolean; exchangeBalances?: { asset: string; free: number; total: number; usdValue?: number }[] }>('/dashboard/stats');
      if (data?.stats) {
        setDashStats(data.stats);
      }
      if (data?.exchangeConnected && localStorage.getItem('cladex_demo_mode') !== 'true') {
        setExchangeConnected(true);
        localStorage.setItem('cladex_exchange_connected', 'true');
        if (data.exchangeBalances) {
          setExchangeBalance({ total: data.stats.totalBalance, balances: data.exchangeBalances });
        }
      }
    } catch {
      // Backend unreachable
    }

    // Fetch recent trades
    try {
      const data = await api.get<{ trades: Array<{
        id: string;
        pair?: string;
        side?: string;
        price?: number;
        profit?: number;
        status?: string;
        createdAt?: string;
        agent?: { name?: string; personality?: string };
      }> }>('/trades/recent');
      if (data?.trades && data.trades.length > 0) {
        const items: ActivityItem[] = data.trades.map((t) => ({
          id: t.id,
          type: 'trade' as const,
          tradeDirection: (t.side === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
          agentPersonality: (t.agent?.personality?.toLowerCase() || undefined) as ActivityItem['agentPersonality'],
          message: `${t.agent?.name || 'Agent'}: ${(t.side || 'buy').toUpperCase()} ${t.pair || 'Unknown'} at $${(t.price ?? 0).toLocaleString()}${t.profit != null ? ` (P/L: ${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)})` : ''}`,
          timestamp: t.createdAt || new Date().toISOString(),
        }));
        setTradeLogItems(items);
      }
    } catch {
      // Backend unreachable
    }

    // Fetch live signals
    try {
      const data = await api.get<{ signals: typeof liveSignals }>('/trades/signals');
      if (data?.signals) {
        setLiveSignals(data.signals);
      }
    } catch {
      // No signals
    }

    // Fetch agent comms
    try {
      const data = await api.get<{ comms: { id: string; agentName: string; personality: string; message: string; type: string; timestamp: string }[] }>('/agents/comms');
      if (data?.comms) {
        setAgentComms(data.comms);
      }
    } catch {
      // No comms available
    }
  }, []);

  // Fetch on mount + auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change — scoped to container only
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  useEffect(() => {
    const el = chatMessagesEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isTyping]);

  // Initial welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: 'welcome',
        role: 'ai',
        text: "Welcome to Cladex! \u{1F44B} Explore agents, watch live trades, and ask me anything. When you're ready to trade, connect your exchange and I'll suggest the best setups for you!",
      }]);
    }
  }, [chatMessages.length]);

  const sendMessage = useCallback((overrideInput?: string) => {
    const text = overrideInput || inputValue.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Call real AI
    (async () => {
      try {
        const history = chatMessages.slice(-10).map(m => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.text,
        }));
        const data = await api.post<{ response: string }>('/ai/chat', {
          message: text,
          history,
          exchangeConnected,
        });
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: data.response,
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } catch {
        // Fallback message if API fails
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: "AI is temporarily unavailable. Please try again.",
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      }
      setIsTyping(false);
    })();
  }, [inputValue, exchangeConnected, chatMessages]);

  // handleConnect and handleSkipDemo kept for backward compatibility but modal flow is primary

  const handleCloseModal = () => {
    setShowConnectModal(false);
    setSelectedExchange('');
    setApiKey('');
    setApiSecret('');
  };

  const handleModalConnect = async () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;
    setConnectingState('connecting');
    localStorage.removeItem('cladex_demo_mode');
    try {
      const connectData = await api.post<{ exchange: Record<string, unknown>; balance?: { total: number; balances: { asset: string; free: number; total: number }[] } }>('/exchange/connect', { name: selectedExchange, apiKey, apiSecret });
      setConnectingState('success');

      // Update balance immediately from connect response
      if (connectData?.balance) {
        setExchangeBalance({ total: connectData.balance.total, balances: connectData.balance.balances || [] });
      }

      setTimeout(() => {
        setExchangeConnected(true);
        setConnectingState('idle');
        setShowConnectModal(false);
        setChatMessages((prev) => [...prev, {
          id: `ai-connected-${Date.now()}`,
          role: 'ai',
          text: `Your ${exchanges.find((e) => e.id === selectedExchange)?.name} account is now connected! Portfolio syncing... Head to Build Agent to deploy your first trading agent.`,
        }]);
      }, 1500);
    } catch {
      setConnectingState('idle');
      setChatMessages((prev) => [...prev, {
        id: `ai-error-${Date.now()}`,
        role: 'ai',
        text: "Failed to connect exchange. Please check your API keys and try again.",
      }]);
    }
  };

  // ==================================================================
  // FULL DASHBOARD (always shown, demo mode when not connected)
  // ==================================================================

  return (
    <div className="space-y-8 relative">

      {/* Founding Points Banner — demo only */}
      {!exchangeConnected && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm">&#x26A1;</span>
            <span className="text-xs font-semibold text-indigo-300">10,000 Founding Points</span>
            <span className="text-[10px] text-gray-500">&middot; $CLDX coming soon</span>
          </div>
          <a href="/dashboard/points" className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Learn more
          </a>
        </div>
      )}

      {/* Live Mode Banner */}
      {exchangeConnected && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300">Live Trading</span>
            <span className="text-[10px] text-gray-500">&middot; Exchange connected</span>
          </div>
          <a href="/dashboard/settings" className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Manage
          </a>
        </div>
      )}

      {/* Demo Mode Banner */}
      {!exchangeConnected && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Badge status="warning" dot size="sm">Demo Mode</Badge>
            <span className="text-xs text-gray-400">You&apos;re exploring in demo mode. Connect your exchange to go live.</span>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="text-xs font-medium text-[#B8FF3C] hover:brightness-110 transition-colors"
          >
            Connect Exchange
          </button>
        </div>
      )}

      {/* Missed Signals Banner */}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of your trading agents and portfolio</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<BalanceIcon />}
          label="Total Balance"
          value={exchangeConnected ? `$${exchangeBalance.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : dashStats ? `$${dashStats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
        />
        <StatCard
          icon={<PnlIcon />}
          label="24h Profit/Loss"
          value={dashStats ? `${dashStats.totalProfit >= 0 ? '+' : ''}$${dashStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '\u2014'}
          valueColor={dashStats && dashStats.totalProfit >= 0 ? 'text-nova-400' : dashStats && dashStats.totalProfit < 0 ? 'text-red-400' : undefined}
        />
        <StatCard
          icon={<AgentsIcon />}
          label="Active Agents"
          value={dashStats ? String(dashStats.activeAgents) : '0'}
        />
        <StatCard
          icon={<TradesIcon />}
          label="Total Trades"
          value={dashStats ? String(dashStats.totalTrades) : '0'}
        />
      </div>

      {/* Exchange Portfolio */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
        {exchangeConnected ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Exchange Portfolio</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-600">Auto-refreshes every 30s</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-medium">Live</span>
                </div>
              </div>
            </div>
            {exchangeBalance.balances.length > 0 ? (
              <div className="space-y-2">
                {exchangeBalance.balances.map((b) => (
                  <div key={b.asset} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{b.asset}</span>
                      <span className="text-xs text-gray-500">{b.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                    </div>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      ${(b.usdValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Total</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    ${exchangeBalance.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-2">Loading balances...</p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-3">Connect your exchange to see your portfolio</p>
            <button
              onClick={() => { setShowConnectModal(true); }}
              className="px-4 py-2 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-xs font-semibold text-[#B8FF3C] hover:bg-[#B8FF3C]/20 transition-all"
            >
              Connect Exchange
            </button>
          </div>
        )}
      </div>

      {/* Cladex AI Chat — Goals & Strategy */}
      <section>
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118]/80 backdrop-blur-xl overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B8FF3C] flex items-center justify-center shadow-lg shadow-[#B8FF3C]/15">
              <span className="text-xs font-bold text-black">C</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">Cladex AI</h2>
              <p className="text-[10px] text-gray-500">Your trading strategist</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-nova-500/10 border border-nova-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-nova-400 animate-pulse" />
              <span className="text-[10px] text-nova-400 font-medium">ONLINE</span>
            </div>
          </div>

          <ChatPanel
            messages={chatMessages.length > 0 ? chatMessages : [{
              id: 'goal-welcome',
              role: 'ai',
              text: "You're connected! \u{1F389} Now tell me — what's your trading goal? Are you looking for steady passive income, aggressive growth, or portfolio protection? I'll match you with the right agent strategy.",
            }]}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={() => sendMessage()}
            isTyping={isTyping}
            messagesEndRef={chatMessagesEndRef}
            className="h-[280px]"
            inputPlaceholder="Tell me your trading goals..."
          />
        </div>
      </section>

      {/* My Agents */}
      <section>
        {deployedAgents.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-100">My Agents</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400 font-medium">{deployedAgents.length}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {deployedAgents.filter(a => a.status === 'active').length} active
                </span>
              </div>
              <a href="/dashboard/agents" className="text-[11px] font-medium text-[#B8FF3C] hover:brightness-110 transition-colors">
                Manage →
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deployedAgents.slice(0, 3).map(agent => {
                const statusColor = agent.status === 'active' ? 'bg-emerald-400 animate-pulse' : agent.status === 'pending' ? 'bg-amber-400 animate-pulse' : agent.status === 'paused' ? 'bg-amber-400' : 'bg-gray-500';
                const statusLabel = agent.status === 'active' ? 'Active' : agent.status === 'pending' ? 'Deploying' : agent.status === 'paused' ? 'Paused' : 'Stopped';
                const pColor = agent.personality === 'apex' ? 'text-red-400' : agent.personality === 'echo' ? 'text-violet-400' : agent.personality === 'nova' ? 'text-emerald-400' : 'text-cyan-400';
                const pBorder = agent.personality === 'apex' ? 'border-red-500/15' : agent.personality === 'echo' ? 'border-violet-500/15' : agent.personality === 'nova' ? 'border-emerald-500/15' : 'border-cyan-500/15';
                const pBg = agent.personality === 'apex' ? 'bg-red-500/[0.03]' : agent.personality === 'echo' ? 'bg-violet-500/[0.03]' : agent.personality === 'nova' ? 'bg-emerald-500/[0.03]' : 'bg-cyan-500/[0.03]';
                const personalityLabel = agent.personality === 'apex' ? 'Apex' : agent.personality === 'echo' ? 'Echo' : agent.personality === 'nova' ? 'Nova' : 'Sage';
                const intel = agent.personality === 'apex'
                  ? 'Scanning for breakouts...'
                  : agent.personality === 'echo'
                  ? 'Reading market patterns...'
                  : agent.personality === 'nova'
                  ? 'Monitoring risk levels...'
                  : 'Crunching data points...';

                return (
                  <a key={agent.id} href="/dashboard/agents" className={`block rounded-xl border ${pBorder} ${pBg} p-4 hover:border-white/[0.12] transition-all group`}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <AgentAvatar personality={agent.personality} size={40} active={agent.status === 'active'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${pColor}`}>{agent.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-500">{personalityLabel}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">{agent.plan}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live intelligence */}
                    {agent.status === 'active' && (
                      <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                        <svg className="w-3 h-3 text-[#B8FF3C] animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-[10px] text-gray-400 italic">{intel}</span>
                      </div>
                    )}

                    {agent.status === 'pending' && (
                      <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                        <svg className="w-3 h-3 animate-spin text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        <span className="text-[10px] text-amber-400">Deploying on-chain...</span>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className={`text-sm font-bold ${agent.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {agent.pnl >= 0 ? '+' : ''}${agent.pnl.toFixed(0)}
                        </span>
                        <p className="text-[9px] text-gray-600">P&L</p>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-white">{agent.totalTrades}</span>
                        <p className="text-[9px] text-gray-600">Trades</p>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-bold text-white">{agent.winRate > 0 ? `${agent.winRate}%` : '—'}</span>
                        <p className="text-[9px] text-gray-600">Win Rate</p>
                      </div>
                    </div>

                    {/* Wallet */}
                    {agent.walletAddress && (
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04]">
                        <svg className="w-3 h-3 text-emerald-400/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M22 10H18a2 2 0 000 4h4" /></svg>
                        <span className="text-[9px] text-emerald-400/50 truncate">{agent.walletAddress}</span>
                        <span className="text-[8px] text-gray-600 ml-auto">On-chain</span>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
            {deployedAgents.length > 3 && (
              <a
                href="/dashboard/agents"
                className="mt-2.5 w-full py-2 rounded-lg border border-[#1e1e2e] bg-white/[0.02] text-xs font-medium text-gray-400 hover:text-white hover:border-white/[0.1] transition-all flex items-center justify-center gap-1.5"
              >
                View All {deployedAgents.length} Agents
              </a>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-200 mb-1">Deploy your first agent to get started</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">Use the AI chat to build your first agent — it takes 30 seconds.</p>
            <a
              href="/dashboard/build"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#B8FF3C]/20"
            >
              Build First Agent
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </a>
          </div>
        )}
      </section>

      {/* Live Trade Signals */}
      {liveSignals.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-100">Trade Signals</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-pulse" />
              <span className="text-[10px] text-[#B8FF3C] font-medium">AI-Powered</span>
            </div>
          </div>
          <div className="space-y-3">
            {liveSignals.map((sig) => {
              const pColor = sig.agent.personality === 'APEX' ? 'text-red-400 border-red-500/20' : sig.agent.personality === 'ECHO' ? 'text-violet-400 border-violet-500/20' : sig.agent.personality === 'NOVA' ? 'text-emerald-400 border-emerald-500/20' : 'text-cyan-400 border-cyan-500/20';
              const isBuy = sig.side === 'buy';
              const rr = Math.abs(sig.takeProfit - sig.entryPrice) / Math.abs(sig.entryPrice - sig.stopLoss);
              const expiresIn = Math.max(0, Math.round((new Date(sig.expiresAt).getTime() - Date.now()) / 60000));

              return (
                <div key={sig.id} className={`rounded-xl border ${pColor.split(' ')[1]} bg-[#111118] p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AgentAvatar personality={(sig.agent.personality?.toLowerCase() || 'sage') as AgentPersonality} size={24} active />
                      <span className={`text-sm font-semibold ${pColor.split(' ')[0]}`}>{sig.agent.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {sig.side.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{expiresIn}m left</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${sig.confidence >= 80 ? 'bg-emerald-500/15 text-emerald-400' : sig.confidence >= 70 ? 'bg-amber-500/15 text-amber-400' : 'bg-gray-500/15 text-gray-400'}`}>
                        {sig.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-white">{sig.symbol}</span>
                    <span className="text-lg font-bold text-white tabular-nums">${sig.entryPrice.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Stop Loss</span>
                      <p className="text-red-400 font-semibold tabular-nums">${sig.stopLoss.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Take Profit</span>
                      <p className="text-emerald-400 font-semibold tabular-nums">${sig.takeProfit.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">R:R</span>
                      <p className="text-white font-semibold">1:{rr.toFixed(1)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">{sig.reason}</p>

                  {exchangeConnected ? (
                    <button
                      onClick={async () => {
                        setExecutingTrade(sig.id);
                        try {
                          await api.post('/trades/execute', {
                            symbol: sig.symbol,
                            side: sig.side,
                            amount: 0.001, // minimum amount — user should adjust
                            type: 'market',
                            stopLoss: sig.stopLoss,
                            takeProfit: sig.takeProfit,
                            reason: `Signal from ${sig.agent.name}: ${sig.reason}`,
                          });
                          setLiveSignals(prev => prev.filter(s => s.id !== sig.id));
                        } catch (err: any) {
                          alert(err?.message || 'Trade failed');
                        }
                        setExecutingTrade(null);
                      }}
                      disabled={executingTrade === sig.id}
                      className="w-full py-2.5 rounded-lg bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {executingTrade === sig.id ? 'Executing...' : `Execute ${sig.side.toUpperCase()} ${sig.symbol}`}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="w-full py-2.5 rounded-lg border border-[#B8FF3C]/20 bg-[#B8FF3C]/10 text-[#B8FF3C] font-semibold text-sm hover:bg-[#B8FF3C]/20 transition-all"
                    >
                      Connect Exchange to Execute
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Agent Comms — Live Feed from real agents */}
      {agentComms.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-100">Agent Comms</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">Live</span>
            </div>
            <span className="text-[10px] text-gray-600">Auto-refreshes</span>
          </div>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin divide-y divide-[#1e1e2e]/60">
              {agentComms.map((msg) => {
                const pColor = msg.personality === 'apex' ? 'text-red-400' : msg.personality === 'echo' ? 'text-violet-400' : msg.personality === 'nova' ? 'text-emerald-400' : 'text-cyan-400';
                return (
                  <div key={msg.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="mt-0.5 shrink-0">
                      <AgentAvatar personality={(msg.personality || 'sage') as AgentPersonality} size={28} active />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-semibold text-sm ${pColor}`}>{msg.agentName}</span>
                        <span className="text-[10px] text-gray-600">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trade Log — collapsible dropdown */}
      <section>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
          {/* Header — clickable to toggle */}
          <button
            onClick={() => setShowAllTrades(!showAllTrades)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-100">Trade Log</h2>
              <span className="w-2 h-2 rounded-full bg-nova-400 animate-pulse" />
              <span className="text-[10px] text-gray-500">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">{tradeLogItems.length} trades</span>
              <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showAllTrades ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {/* Trade list — collapsible */}
          <div className={`overflow-hidden transition-all duration-300 ease-out ${showAllTrades ? 'max-h-[500px] border-t border-white/[0.04]' : 'max-h-0'}`}>
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin p-2">
              {tradeLogItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Your trade activity will appear here</p>
              ) : (
                <ActivityFeed items={tradeLogItems} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Referral */}
      <section>
        <ReferralCard />
      </section>


      {/* ============================================ */}
      {/* Connect Exchange Modal (with simulation)    */}
      {/* ============================================ */}
      {showConnectModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#1e1e2e] bg-[#111118] shadow-2xl shadow-black/60 overflow-hidden animate-slideUp">

              {/* Close button */}
              <div className="flex justify-end p-3 pb-0">
                <button
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Connect Exchange Form */}
              {(
                <div className="px-6 pb-6 pt-2 animate-fadeIn">
                  <h3 className="text-base font-bold text-gray-100 text-center mb-1">Connect your exchange to activate trading</h3>
                  <p className="text-xs text-gray-500 text-center mb-5">Ready to go live? Connect your exchange.</p>

                  {/* Trust items */}
                  <div className="flex items-center justify-center gap-4 mb-5">
                    <div className="flex items-center gap-1.5 text-[11px] text-nova-400">
                      <ShieldIcon />
                      <span>Funds stay on exchange</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-nova-400">
                      <LockIcon />
                      <span>No withdrawals</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-echo-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                        <line x1="12" y1="2" x2="12" y2="12" />
                      </svg>
                      <span>Disconnect anytime</span>
                    </div>
                  </div>

                  {/* Exchange Selector Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {exchanges.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExchange(ex.id)}
                        className={[
                          'rounded-lg border-2 p-2.5 flex items-center gap-2 transition-all duration-200',
                          selectedExchange === ex.id
                            ? 'border-[#B8FF3C]/60 bg-[#B8FF3C]/10 shadow-lg shadow-[#B8FF3C]/10'
                            : 'border-[#1e1e2e] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
                        ].join(' ')}
                      >
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: `${ex.color}20`, color: ex.color }}
                        >
                          {ex.letter}
                        </div>
                        <span className={`text-xs font-medium ${selectedExchange === ex.id ? 'text-gray-100' : 'text-gray-400'}`}>
                          {ex.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* API Key Fields */}
                  {selectedExchange && (
                    <div className="space-y-2.5 mb-4 animate-fadeSlideDown">
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block">API Key</label>
                        <input
                          type="text"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your API key"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block">API Secret</label>
                        <input
                          type="password"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          placeholder="Paste your API secret"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Success overlay */}
                  {connectingState === 'success' && (
                    <div className="flex flex-col items-center justify-center gap-3 py-4 animate-fadeIn">
                      <div className="animate-bounce"><CheckCircleIcon /></div>
                      <p className="text-base font-semibold text-nova-400">Connected!</p>
                      <p className="text-xs text-gray-400">Syncing your portfolio...</p>
                    </div>
                  )}

                  {/* Connect Button */}
                  {connectingState !== 'success' && (
                    <button
                      onClick={handleModalConnect}
                      disabled={!selectedExchange || !apiKey || !apiSecret || connectingState !== 'idle'}
                      className="w-full py-2.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 mb-3"
                    >
                      {connectingState === 'connecting' ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          Connecting...
                        </span>
                      ) : 'Connect Exchange'}
                    </button>
                  )}

                  {/* Continue in Demo Mode */}
                  {connectingState === 'idle' && (
                    <button onClick={handleCloseModal} className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                      Continue in Demo Mode
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-fadeSlideDown {
          animation: fadeSlideDown 0.3s ease-out forwards;
        }
        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-12px); }
        }
        .animate-fadeUp {
          animation: fadeUp 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
