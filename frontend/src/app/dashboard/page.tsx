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
import MarketIntelligence from '@/components/dashboard/MarketIntelligence';
import type { ActivityItem } from '@/components/dashboard/ActivityFeed';
import { TradeExecutionModal } from '@/components/dashboard/TradeExecutionModal';
import type { TradeSignal } from '@/hooks/useSignalGenerator';

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
// AI MARKET SCANNER
// ==============================================================

interface LivePrice {
  symbol: string;
  price: number;
  change: number;
}

function AIMarketScanner() {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);

  const agents = [
    { name: 'Raze', personality: 'apex', color: 'text-red-400', status: 'Hunting breakouts' },
    { name: 'Knox', personality: 'nova', color: 'text-emerald-400', status: 'Checking risk levels' },
    { name: 'Iris', personality: 'echo', color: 'text-violet-400', status: 'Pattern matching' },
    { name: 'Byte', personality: 'sage', color: 'text-cyan-400', status: 'Crunching data' },
  ];

  const scanSteps = livePrices.length > 0 ? [
    { label: `Scanning BTC/USDT — $${livePrices.find(p => p.symbol === 'BTC/USDT')?.price.toLocaleString() || '...'}`, icon: '📊' },
    { label: `Analyzing ETH — $${livePrices.find(p => p.symbol === 'ETH/USDT')?.price.toLocaleString() || '...'}`, icon: '📈' },
    { label: `Checking SOL — $${livePrices.find(p => p.symbol === 'SOL/USDT')?.price.toLocaleString() || '...'}`, icon: '🔍' },
    { label: 'Running RSI divergence scan', icon: '⚡' },
    { label: 'Evaluating support/resistance levels', icon: '🎯' },
    { label: 'Cross-referencing whale wallets', icon: '🐋' },
    { label: 'Computing risk/reward ratios', icon: '🧮' },
    { label: `Scanning LINK — $${livePrices.find(p => p.symbol === 'LINK/USDT')?.price.toLocaleString() || '...'}`, icon: '🔗' },
    { label: 'Checking liquidation heatmaps', icon: '🔥' },
    { label: 'Evaluating market sentiment', icon: '🧠' },
  ] : [
    { label: 'Connecting to markets...', icon: '📊' },
    { label: 'Loading price data...', icon: '📈' },
  ];

  useEffect(() => {
    // Fetch real prices
    const fetchPrices = async () => {
      try {
        const pairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'LINK-USDT', 'AVAX-USDT'];
        const prices: LivePrice[] = [];
        for (const pair of pairs) {
          try {
            const data = await api.get<{ symbol: string; price: number; change: number }>(`/trades/price/${pair}`);
            if (data?.price) {
              prices.push({ symbol: data.symbol, price: data.price, change: data.change || 0 });
            }
          } catch { /* skip this pair */ }
        }
        if (prices.length > 0) setLivePrices(prices);
      } catch { /* no prices */ }
    };

    fetchPrices();
    const priceInterval = setInterval(fetchPrices, 30000);

    const stepInterval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % Math.max(scanSteps.length, 1));
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 100 ? 0 : prev + Math.random() * 8 + 2);
    }, 500);

    const agentInterval = setInterval(() => {
      setActiveAgentIdx(prev => (prev + 1) % agents.length);
    }, 4000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearInterval(agentInterval);
    };
  }, []);

  const currentStep = scanSteps[stepIdx % scanSteps.length];
  const activeAgent = agents[activeAgentIdx];

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-100">Market Intelligence</h2>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-pulse" />
          <span className="text-[10px] text-[#B8FF3C] font-medium">AI Scanning</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 overflow-hidden">
        {/* Main scanner visual */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-12 h-12 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-[#B8FF3C]/20 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full border-2 border-t-[#B8FF3C] border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-3 rounded-full bg-[#B8FF3C]/10 flex items-center justify-center">
              <span className="text-sm">{currentStep.icon}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white mb-1">Agents at work</p>
            <p className="text-xs text-gray-400 truncate">{currentStep.label}</p>
          </div>
        </div>

        {/* Live prices ticker */}
        {livePrices.length > 0 && (
          <div className="flex items-center gap-4 mb-4 overflow-x-auto no-scrollbar py-1">
            {livePrices.map(p => (
              <div key={p.symbol} className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-gray-300">{p.symbol.replace('/USDT', '')}</span>
                <span className="text-[11px] font-bold text-white tabular-nums">${p.price.toLocaleString()}</span>
                <span className={`text-[10px] font-semibold ${p.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.change >= 0 ? '+' : ''}{p.change?.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B8FF3C]/60 to-[#B8FF3C] transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Active agents row */}
        <div className="flex items-center gap-3 mb-3">
          {agents.map((agent, i) => (
            <div
              key={agent.name}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-500 ${
                i === activeAgentIdx ? 'bg-white/[0.06] border border-white/[0.08]' : ''
              }`}
            >
              <AgentAvatar personality={agent.personality as AgentPersonality} size={16} active={i === activeAgentIdx} />
              <span className={`text-[11px] font-medium ${i === activeAgentIdx ? agent.color : 'text-gray-600'}`}>
                {agent.name}
              </span>
            </div>
          ))}
        </div>

        {/* Current agent action */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className={`text-xs font-semibold ${activeAgent.color}`}>{activeAgent.name}:</span>
          <span className="text-xs text-gray-400">{activeAgent.status}</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>

        <p className="text-[10px] text-gray-600 text-center mt-3">
          Market intelligence updated every 15 min from real data + AI analysis
        </p>
      </div>
    </section>
  );
}

// ==============================================================
// DASHBOARD PAGE
// ==============================================================

export default function DashboardPage() {
  const [exchangeConnected, setExchangeConnected] = useState<boolean>(false);
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
  const [gasBalance, setGasBalance] = useState(0);
  const [tradeLogItems, setTradeLogItems] = useState<ActivityItem[]>([]);
  // agentComms removed — replaced by MarketIntelligence component

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
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);


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
      if (data?.exchangeConnected) {
        setExchangeConnected(true);
        localStorage.setItem('cladex_exchange_connected', 'true');
        if (data.exchangeBalances) {
          setExchangeBalance({ total: data.stats.totalBalance, balances: data.exchangeBalances });
        }
      } else {
        setExchangeConnected(false);
        localStorage.removeItem('cladex_exchange_connected');
      }
    } catch {
      // Backend unreachable
    }

    // Fetch recent trades
    try {
      const data = await api.get<{ trades: Array<{
        id: string;
        symbol?: string;
        side?: string;
        price?: number;
        amount?: number;
        profit?: number;
        status?: string;
        createdAt?: string;
        agent?: { id?: string; name?: string; personality?: string };
      }> }>('/trades/recent');
      if (data?.trades && data.trades.length > 0) {
        const items: ActivityItem[] = data.trades.map((t) => ({
          id: t.id,
          type: 'trade' as const,
          tradeDirection: (t.side === 'SELL' || t.side === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
          agentPersonality: (t.agent?.personality?.toLowerCase() || undefined) as ActivityItem['agentPersonality'],
          message: `${t.agent?.name || 'Manual'}: ${(t.side || 'BUY')} ${t.symbol || '???'} at $${(t.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}${t.profit != null ? ` (P/L: ${t.profit >= 0 ? '+' : ''}$${t.profit.toFixed(2)})` : ''}`,
          timestamp: t.createdAt || new Date().toISOString(),
        }));
        setTradeLogItems(items);
      }
    } catch {
      // Backend unreachable
    }

    // Fetch gas balance
    try {
      const data = await api.get<{ gasBalance: number }>('/dashboard/gas');
      if (data) setGasBalance(data.gasBalance);
    } catch { /* */ }

    // Fetch live signals
    try {
      const data = await api.get<{ signals: typeof liveSignals }>('/trades/signals');
      if (data?.signals) {
        setLiveSignals(data.signals);
      }
    } catch {
      // No signals
    }

    // Market Intelligence now handled by its own component
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
  // FULL DASHBOARD
  // ==================================================================

  const activeAgentCount = deployedAgents.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-5 relative">

      {/* ── Top bar: Status + Balance ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            {exchangeConnected ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400 font-medium">Live Trading</span>
              </div>
            ) : (
              <span className="text-[11px] text-gray-500">Demo Mode</span>
            )}
            {exchangeConnected && gasBalance > 0 && (
              <>
                <span className="text-gray-700">|</span>
                <span className="text-[11px] text-amber-400 font-medium">${gasBalance.toFixed(2)} gas</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white tabular-nums">
            ${exchangeConnected
              ? exchangeBalance.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : dashStats?.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className={`text-xs font-semibold tabular-nums ${
            dashStats && dashStats.totalProfit >= 0 ? 'text-emerald-400' : dashStats && dashStats.totalProfit < 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {dashStats ? `${dashStats.totalProfit >= 0 ? '+' : ''}$${dashStats.totalProfit.toFixed(2)} today` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* ── Quick stats row ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-3 text-center">
          <p className="text-lg font-bold text-white">{dashStats?.activeAgents ?? deployedAgents.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Agents</p>
        </div>
        <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-3 text-center">
          <p className="text-lg font-bold text-white">{dashStats?.totalTrades ?? 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Trades</p>
        </div>
        <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-3 text-center">
          <p className={`text-lg font-bold ${(dashStats?.totalProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {dashStats ? `${dashStats.totalProfit >= 0 ? '+' : ''}${dashStats.totalProfit.toFixed(1)}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">24h P&L</p>
        </div>
      </div>

      {/* ── No gas warning ────────────────────────────────────── */}
      {gasBalance <= 0 && exchangeConnected && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-xs text-red-400">No gas — top up to execute trades</span>
          <a href="/dashboard/settings" className="text-[11px] font-semibold text-red-400 hover:text-red-300">Top Up</a>
        </div>
      )}

      {/* ── Active Signal — top priority when present ─────────── */}
      {liveSignals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-pulse" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Signals</h2>
          </div>
          <div className="space-y-3">
            {liveSignals.map((sig) => {
              const pColor = sig.agent.personality === 'APEX' ? 'text-red-400' : sig.agent.personality === 'ECHO' ? 'text-violet-400' : sig.agent.personality === 'NOVA' ? 'text-emerald-400' : 'text-cyan-400';
              const pBorderColor = sig.agent.personality === 'APEX' ? 'border-red-500/20' : sig.agent.personality === 'ECHO' ? 'border-violet-500/20' : sig.agent.personality === 'NOVA' ? 'border-emerald-500/20' : 'border-cyan-500/20';
              const isBuy = sig.side === 'buy';
              const rr = Math.abs(sig.takeProfit - sig.entryPrice) / Math.abs(sig.entryPrice - sig.stopLoss);
              const expiresIn = Math.max(0, Math.round((new Date(sig.expiresAt).getTime() - Date.now()) / 60000));

              return (
                <div key={sig.id} className={`rounded-2xl border ${pBorderColor} bg-[#111118] overflow-hidden`}>
                  {/* Signal header */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AgentAvatar personality={(sig.agent.personality?.toLowerCase() || 'sage') as AgentPersonality} size={28} active />
                        <span className={`text-sm font-bold ${pColor}`}>{sig.agent.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04]">
                          <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span className="text-[10px] text-gray-400 tabular-nums">{expiresIn}m</span>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sig.confidence >= 80 ? 'bg-emerald-500/15 text-emerald-400' : sig.confidence >= 70 ? 'bg-amber-500/15 text-amber-400' : 'bg-gray-500/15 text-gray-400'}`}>
                          {sig.confidence}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {sig.side.toUpperCase()}
                      </span>
                      <span className="text-base font-bold text-white">{sig.symbol}</span>
                      <span className="ml-auto text-base font-bold text-white tabular-nums">${sig.entryPrice.toLocaleString()}</span>
                    </div>

                    {/* Price levels */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-lg bg-red-500/[0.05] border border-red-500/10 px-2.5 py-2 text-center">
                        <p className="text-[9px] text-red-400/60 uppercase">Stop</p>
                        <p className="text-xs font-bold text-red-400 tabular-nums">${sig.stopLoss.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10 px-2.5 py-2 text-center">
                        <p className="text-[9px] text-emerald-400/60 uppercase">Target</p>
                        <p className="text-xs font-bold text-emerald-400 tabular-nums">${sig.takeProfit.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2 text-center">
                        <p className="text-[9px] text-gray-500 uppercase">R:R</p>
                        <p className="text-xs font-bold text-[#B8FF3C] tabular-nums">1:{rr.toFixed(1)}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed">{sig.reason}</p>
                  </div>

                  {/* Action button — full-width */}
                  {exchangeConnected ? (
                    <button
                      onClick={() => {
                        const mapped: TradeSignal = {
                          id: sig.id,
                          agentName: sig.agent.name,
                          agentId: sig.agent.id,
                          personality: (sig.agent.personality?.toLowerCase() || 'sage') as AgentPersonality,
                          color: '',
                          pair: sig.symbol,
                          side: sig.side === 'buy' ? 'long' : 'short',
                          entryPrice: sig.entryPrice,
                          stopLoss: sig.stopLoss,
                          takeProfit: sig.takeProfit,
                          confidence: sig.confidence,
                          reason: sig.reason,
                          timestamp: Date.now(),
                          expiresAt: new Date(sig.expiresAt).getTime(),
                          status: 'active',
                          estimatedPnl: Math.abs(sig.takeProfit - sig.entryPrice) / sig.entryPrice * 100,
                          isOwnAgent: true,
                        };
                        setSelectedSignal(mapped);
                        setShowTradeModal(true);
                      }}
                      className="w-full py-3 bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all"
                    >
                      Execute {sig.side.toUpperCase()} {sig.symbol}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="w-full py-3 bg-white/[0.04] border-t border-white/[0.06] text-[#B8FF3C] font-semibold text-sm hover:bg-white/[0.06] transition-all"
                    >
                      Connect Exchange to Trade
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Two-column layout: Portfolio + Agents ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* LEFT: Portfolio */}
        <div className="lg:col-span-2 space-y-4">
          {/* Exchange Portfolio */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
            {exchangeConnected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-medium">Live</span>
                  </div>
                </div>
                {exchangeBalance.balances.length > 0 ? (
                  <div className="space-y-1.5">
                    {exchangeBalance.balances.map((b) => {
                      const pct = exchangeBalance.total > 0 ? ((b.usdValue || 0) / exchangeBalance.total * 100) : 0;
                      return (
                        <div key={b.asset} className="flex items-center gap-3 py-1.5">
                          <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-gray-300">
                            {b.asset.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">{b.asset}</span>
                              <span className="text-xs font-semibold text-white tabular-nums">
                                ${(b.usdValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-gray-500 tabular-nums">{b.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                              <span className="text-[10px] text-gray-500 tabular-nums">{pct.toFixed(1)}%</span>
                            </div>
                            {/* Mini bar */}
                            <div className="mt-1 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-[#B8FF3C]/40" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-2">Loading balances...</p>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-[#B8FF3C]/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M22 10H18a2 2 0 000 4h4" /></svg>
                </div>
                <p className="text-xs text-gray-400 mb-3">Connect to see your portfolio</p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-xs font-semibold text-[#B8FF3C] hover:bg-[#B8FF3C]/20 transition-all"
                >
                  Connect Exchange
                </button>
              </div>
            )}
          </div>

          {/* Gas Balance — compact */}
          {exchangeConnected && gasBalance > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#1e1e2e] bg-[#111118]">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-white tabular-nums">${gasBalance.toFixed(2)}</span>
                <span className="text-[10px] text-gray-600">gas</span>
              </div>
              <a href="/dashboard/settings" className="text-[10px] font-semibold text-amber-400 hover:text-amber-300">Top Up</a>
            </div>
          )}

          {/* Trade Log — compact */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
            <button
              onClick={() => setShowAllTrades(!showAllTrades)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trade Log</h2>
                {tradeLogItems.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400">{tradeLogItems.length}</span>
                )}
              </div>
              <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showAllTrades ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${showAllTrades ? 'max-h-[400px] border-t border-white/[0.04]' : 'max-h-0'}`}>
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin p-2">
                {tradeLogItems.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Trade activity will appear here</p>
                ) : (
                  <ActivityFeed items={tradeLogItems} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: AI Chat */}
        <div className="lg:col-span-3 space-y-4">
          {/* AI Chat */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118]/80 backdrop-blur-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#B8FF3C] flex items-center justify-center">
                <span className="text-[10px] font-bold text-black">C</span>
              </div>
              <span className="text-xs font-semibold text-gray-200">Cladex AI</span>
              <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-nova-500/10">
                <span className="w-1 h-1 rounded-full bg-nova-400 animate-pulse" />
                <span className="text-[9px] text-nova-400 font-medium">ONLINE</span>
              </div>
            </div>
            <ChatPanel
              messages={chatMessages.length > 0 ? chatMessages : [{
                id: 'goal-welcome',
                role: 'ai',
                text: "Welcome! Tell me your trading goals and I'll match you with the right strategy.",
              }]}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={() => sendMessage()}
              isTyping={isTyping}
              messagesEndRef={chatMessagesEndRef}
              className="h-[220px]"
              inputPlaceholder="Ask anything about trading..."
            />
          </div>
        </div>
      </div>

      {/* ── Agents at Work — full width ──────────────────────── */}
      {liveSignals.length === 0 && <AIMarketScanner />}

      <section>
        <MarketIntelligence />
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

                  {connectingState === 'idle' && (
                    <button onClick={handleCloseModal} className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                      Skip for now
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

      {/* Trade Execution Modal — spot/futures, amount, leverage */}
      <TradeExecutionModal
        isOpen={showTradeModal}
        signal={selectedSignal}
        onClose={() => { setShowTradeModal(false); setSelectedSignal(null); }}
        onExecute={async (signalId, opts) => {
          const sig = liveSignals.find(s => s.id === signalId);
          if (!sig) return { success: false, error: 'Signal not found' };
          try {
            await api.post('/trades/execute', {
              agentId: sig.agent.id,
              symbol: sig.symbol,
              side: sig.side,
              usdAmount: opts.positionSize,
              type: 'market',
              marketType: opts.marketType,
              leverage: opts.marketType === 'futures' ? opts.leverage : undefined,
              stopLoss: sig.stopLoss,
              takeProfit: sig.takeProfit,
              reason: `Signal from ${sig.agent.name}: ${sig.reason}`,
            });
            setLiveSignals(prev => prev.filter(s => s.id !== signalId));
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err?.message || 'Trade execution failed' };
          }
        }}
        exchangeConnected={exchangeConnected}
        exchangeName="Bybit"
      />
    </div>
  );
}
