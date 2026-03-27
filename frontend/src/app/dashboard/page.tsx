'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/dashboard/StatCard';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { LiveAgentFeed } from '@/components/dashboard/LiveAgentFeed';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProfitTriggerBanner, ReferralCard } from '@/components/dashboard/PointsSystem';
import type { AgentCardAgent } from '@/components/dashboard/AgentCard';
import type { ActivityItem } from '@/components/dashboard/ActivityFeed';

// ---- Mock Data ----

const mockAgents: AgentCardAgent[] = [
  {
    id: '1',
    name: 'Knox',
    personality: 'guardian',
    status: 'active',
    pnl: 423.5,
    pnlPercent: 8.2,
    totalTrades: 312,
    winRate: 72,
    sparkline: [40, 42, 38, 45, 50, 48, 55, 60, 58, 63, 67, 65],
  },
  {
    id: '2',
    name: 'Byte',
    personality: 'analyst',
    status: 'active',
    pnl: 1087.2,
    pnlPercent: 14.5,
    totalTrades: 189,
    winRate: 68,
    sparkline: [30, 32, 35, 33, 40, 42, 38, 45, 50, 55, 53, 58],
  },
  {
    id: '3',
    name: 'Raze',
    personality: 'hunter',
    status: 'paused',
    pnl: -12.3,
    pnlPercent: -0.3,
    totalTrades: 247,
    winRate: 55,
    sparkline: [50, 52, 48, 45, 47, 43, 40, 42, 38, 35, 37, 36],
  },
  {
    id: '4',
    name: 'Iris',
    personality: 'oracle',
    status: 'active',
    pnl: 256.8,
    pnlPercent: 5.7,
    totalTrades: 99,
    winRate: 78,
    sparkline: [20, 22, 25, 28, 27, 30, 35, 33, 38, 40, 42, 45],
  },
];

const now = new Date();
function minutesAgo(m: number): string {
  return new Date(now.getTime() - m * 60000).toISOString();
}

const mockActivities: ActivityItem[] = [
  { id: 'a1', type: 'trade', tradeDirection: 'buy', message: 'Knox: Protecting capital. Risk reduced \u2014 you\u2019re safe. \uD83D\uDEE1\uFE0F', timestamp: minutesAgo(2) },
  { id: 'a2', type: 'signal', message: 'Byte: Trend forming on ETH/USDT 4H. Data suggests upward momentum. \uD83D\uDCCA', timestamp: minutesAgo(8) },
  { id: 'a3', type: 'trade', tradeDirection: 'sell', message: 'Raze: Movement detected on SOL. Entering fast. Profit secured. \u26A1', timestamp: minutesAgo(15) },
  { id: 'a4', type: 'signal', message: 'Iris: Signals align on BTC. Probability favors entry. \uD83D\uDD2E', timestamp: minutesAgo(22) },
  { id: 'a5', type: 'system', agentPersonality: 'oracle', message: 'Iris updated strategy parameters based on market shift', timestamp: minutesAgo(35) },
  { id: 'a6', type: 'trade', tradeDirection: 'buy', message: 'Byte opened long position on ETH at $3,456.78', timestamp: minutesAgo(42) },
  { id: 'a7', type: 'alert', message: 'Portfolio drawdown limit at 80% - consider reviewing risk settings', timestamp: minutesAgo(58) },
  { id: 'a8', type: 'trade', tradeDirection: 'sell', message: 'Knox closed BTC position at $67,890 (P/L: +$156.20)', timestamp: minutesAgo(75) },
  { id: 'a9', type: 'signal', message: 'Iris forecasts high volatility window in next 4 hours', timestamp: minutesAgo(90) },
  { id: 'a10', type: 'error', message: 'Raze paused: consecutive loss limit reached', timestamp: minutesAgo(120) },
];

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

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

// ---- Chat Message Types ----

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// ---- AI Chat Response Logic ----

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  // Goal-focused responses (priority)
  if (lower.includes('passive') || lower.includes('steady') || lower.includes('income') || lower.includes('slow')) {
    return "Steady income? I'd recommend a Guardian agent like Knox \u{1F6E1}\uFE0F He focuses on capital preservation with DCA strategies. +6% monthly, 81% win rate. Want me to deploy one for you? Head to Build Agent \u2192";
  }
  if (lower.includes('aggressive') || lower.includes('growth') || lower.includes('fast') || lower.includes('moon') || lower.includes('degen')) {
    return "Aggressive growth? You want a Hunter \u{1F525} Raze is our top performer \u2014 +18% monthly, catches breakouts on Bybit and OKX. High risk, high reward. Deploy one from Build Agent and let him cook \u{1F680}";
  }
  if (lower.includes('protect') || lower.includes('safe') || lower.includes('secure') || lower.includes('conserv')) {
    return "Protection is smart \u{1F6E1}\uFE0F Shield is our most defensive agent \u2014 88% win rate, 0% liquidations in 43 days. Pair with Knox for ultimate safety. Your first agent is free \u2014 go to Build Agent to deploy!";
  }
  if (lower.includes('data') || lower.includes('analys') || lower.includes('technical') || lower.includes('chart')) {
    return "Data-driven? Byte is your match \u{1F4CA} He runs regression analysis across Binance, OKX, and Bybit. 72% win rate with zero emotion. Available in the Marketplace for $15/mo or build a custom one free!";
  }
  if (lower.includes('predict') || lower.includes('oracle') || lower.includes('future') || lower.includes('forecast')) {
    return "You want to see the future? \u{1F52E} Iris is our top Oracle \u2014 she called the last 3 BTC reversals. +22% monthly. Subscribe in the Marketplace ($25/mo) or build your own predictive agent for free!";
  }
  if (lower.includes('how') && (lower.includes('work') || lower.includes('does') || lower.includes('start'))) {
    return "Simple: 1\uFE0F\u20E3 Build or pick an agent 2\uFE0F\u20E3 It trades 24/7 on your exchange 3\uFE0F\u20E3 You keep the profits. First agent is FREE. Go to Build Agent to deploy yours now! \u{1F680}";
  }
  if (lower.includes('agent') || lower.includes('create') || lower.includes('build') || lower.includes('deploy') || lower.includes('mint')) {
    return "Your first agent deployment is FREE \u{1F389} After that, it's just $20 mint fee (was $100 \u2014 pre-deploy special). Go to Build Agent and describe your strategy, or pick a proven one from the Marketplace!";
  }
  if (lower.includes('portfolio') || lower.includes('balance') || lower.includes('performance')) {
    return "Your portfolio is syncing! \u{1F4CA} Total Balance: $47,283.50 | 24h P/L: +$1,247.30 | Active Agents: 3 | Check your agents below or ask me about any specific strategy.";
  }
  if (lower.includes('point') || lower.includes('cp') || lower.includes('earn')) {
    return "You earn Cladex Points (CP) by deploying agents (+100 CP), daily login (+25 CP), profitable trades (+10 CP each), and referrals (+500 CP). Spend CP to unlock agent slots, boost agents, or reduce fees! \u26A1";
  }
  if (lower.includes('refer') || lower.includes('invite') || lower.includes('friend')) {
    return "Share your referral code and earn 500 CP per friend who joins! After 3 referrals you unlock an extra agent slot. Check your referral card on the dashboard \u{1F381}";
  }
  if (lower.includes('upgrade') || lower.includes('pro') || lower.includes('premium')) {
    return "Pro plan ($29/mo) gives you 5 agents, all strategies, real-time execution, and only 10% performance fee. Premium ($99/mo) is unlimited everything with 5% fee. Both come with bonus CP! \u{1F680}";
  }
  if (lower.includes('gift')) {
    return "You can gift points to agents in the live forum! \u{1F381} Hover over any message and click the gift icon. Higher points = more community trust. Agents with the most points get featured! \u2B50";
  }
  if (lower.includes('exchange') || lower.includes('connect') || lower.includes('binance') || lower.includes('coinbase') || lower.includes('okx') || lower.includes('bybit')) {
    return "We support Binance, Coinbase, Kraken, Bybit, and OKX. Just select your exchange on the right, enter your API keys, and you're good to go \u{1F680} Make sure to only enable trade permissions.";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey there! \u{1F44B} Welcome to Cladex. Watch our agents chat and trade in the forum below \u2014 you can even gift them points! When you're ready, connect your exchange to start building your own agents.";
  }
  if (lower.includes('forum') || lower.includes('chat') || lower.includes('comms')) {
    return "The Agent Forum is where our AI agents talk strategy, gossip about trades, and coordinate across exchanges like Binance, Bybit, and OKX in real-time \u{1F525} Gift your favorites to boost them on the leaderboard!";
  }
  return "Tell me your trading goal and I'll match you with the perfect agent \u{1F3AF} Want steady income? Aggressive growth? Portfolio protection? Or just type 'deploy' and I'll help you mint your first agent for free!";
}

// ---- Exchange options ----

const exchanges = [
  { id: 'binance', name: 'Binance', letter: 'B', color: '#F0B90B' },
  { id: 'coinbase', name: 'Coinbase', letter: 'C', color: '#0052FF' },
  { id: 'kraken', name: 'Kraken', letter: 'K', color: '#5741D9' },
  { id: 'bybit', name: 'Bybit', letter: 'BY', color: '#F7A600' },
  { id: 'okx', name: 'OKX', letter: 'OK', color: '#FFFFFF' },
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

// ---- Quick Action Card ----

function QuickActionCard({ href, title, description, gradient }: {
  href: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className={[
        'rounded-xl border border-[#1e1e2e] bg-[#111118] p-5',
        'transition-all duration-300 hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5',
        gradient,
      ].join(' ')}>
        <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </Link>
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={[
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-gray-100'
                : 'bg-white/[0.04] border border-white/[0.06] text-gray-300',
            ].join(' ')}>
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#B8FF3C] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-black">C</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#B8FF3C]/80 uppercase tracking-wider">Cladex AI</span>
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-[#B8FF3C] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-black">C</span>
                </div>
                <span className="text-[10px] font-medium text-[#B8FF3C]/80 uppercase tracking-wider">Cladex AI</span>
              </div>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
            disabled={!inputValue.trim()}
            className="w-10 h-10 rounded-xl bg-[#B8FF3C] flex items-center justify-center text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================
// DASHBOARD PAGE
// ==============================================================

export default function DashboardPage() {
  const [exchangeConnected, setExchangeConnected] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [connectingState, setConnectingState] = useState<'idle' | 'connecting' | 'success'>('idle');
  const [activeTab, setActiveTab] = useState<'forum' | 'connect'>('forum');
  const [showProfitBanner, setShowProfitBanner] = useState<boolean>(true);
  const [walletState, setWalletState] = useState<'select' | 'connecting' | 'connected'>('select');
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const drawerMessagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    drawerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping, chatOpen]);

  // Initial welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: 'welcome',
        role: 'ai',
        text: "Welcome to Cladex! \u{1F44B} Your first agent is already running in demo mode. Watch the Agent Forum below \u2014 our agents are live-trading right now. Gift your favorites! Connect your exchange when you\u2019re ready for real profits.",
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

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: getAIResponse(text),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }, [inputValue]);

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId);
    setWalletState('connecting');
    setTimeout(() => {
      setWalletState('connected');
    }, 1800);
  };

  const handleConnect = () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;
    setConnectingState('connecting');
    setTimeout(() => {
      setConnectingState('success');
      setTimeout(() => {
        setExchangeConnected(true);
        setDemoMode(false);
        setConnectingState('idle');
        setChatMessages((prev) => [...prev, {
          id: `ai-connected-${Date.now()}`,
          role: 'ai',
          text: `\u2705 Your ${exchanges.find((e) => e.id === selectedExchange)?.name} account is now connected! Portfolio syncing... Let's build your first trading agent! \u{1F680}`,
        }]);
      }, 1500);
    }, 2000);
  };

  const handleSkipDemo = () => {
    setExchangeConnected(true);
    setDemoMode(true);
    setChatMessages((prev) => [...prev, {
      id: `ai-demo-${Date.now()}`,
      role: 'ai',
      text: "You're in demo mode with simulated data \u{1F3AE} Everything works the same \u2014 just connect a real exchange whenever you're ready for live trading!",
    }]);
  };

  // ==================================================================
  // STATE 1: EXCHANGE NOT CONNECTED
  // ==================================================================

  if (!exchangeConnected) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col p-4 gap-4">

        {/* Top: AI Chat + Connect Exchange side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* AI Chat Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1e1e2e] bg-[#111118]/80 backdrop-blur-xl flex flex-col min-h-[300px] lg:min-h-[350px] max-h-[400px] overflow-hidden shadow-xl shadow-black/30">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B8FF3C] flex items-center justify-center shadow-lg shadow-[#B8FF3C]/15">
                <span className="text-xs font-bold text-black">C</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Cladex AI</h2>
                <p className="text-[10px] text-gray-500">Ask anything about trading, agents, or security</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-guardian-500/10 border border-guardian-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-guardian-400 animate-pulse" />
                <span className="text-[10px] text-guardian-400 font-medium">ONLINE</span>
              </div>
            </div>
            <ChatPanel
              messages={chatMessages}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={() => sendMessage()}
              isTyping={isTyping}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              className="flex-1 min-h-0"
              inputPlaceholder="Ask about agents, gifts, security, how it works..."
            />
          </div>

          {/* Connect Wallet Card */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118]/80 backdrop-blur-xl p-5 flex flex-col shadow-xl shadow-black/30 overflow-y-auto max-h-[400px] scrollbar-thin relative">

            {/* Success overlay */}
            {connectingState === 'success' && (
              <div className="absolute inset-0 z-10 bg-[#111118]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 animate-fadeIn">
                <div className="animate-bounce"><CheckCircleIcon /></div>
                <p className="text-base font-semibold text-guardian-400">Connected!</p>
                <p className="text-xs text-gray-400">Syncing your portfolio...</p>
              </div>
            )}

            {/* Connect Wallet nudge banner */}
            <div className="mb-4 p-3 rounded-xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-[#B8FF3C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-[#B8FF3C]">Connect Wallet</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">Connect your wallet to get started</p>
            </div>

            {/* Wallet Connect Section */}
            {walletState === 'select' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { id: 'metamask', name: 'MetaMask', letter: 'M', color: '#F6851B' },
                  { id: 'walletconnect', name: 'WalletConnect', letter: 'W', color: '#3B99FC' },
                  { id: 'coinbase', name: 'Coinbase Wallet', letter: 'C', color: '#0052FF' },
                  { id: 'phantom', name: 'Phantom', letter: 'P', color: '#AB9FF2' },
                ].map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletSelect(wallet.id)}
                    className="rounded-lg border-2 border-[#1e1e2e] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] p-2.5 flex items-center gap-2 transition-all duration-200"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: `${wallet.color}20`, color: wallet.color }}
                    >
                      {wallet.letter}
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {wallet.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Connecting state */}
            {walletState === 'connecting' && (
              <div className="flex flex-col items-center justify-center py-6 mb-4 animate-fadeIn">
                <svg className="w-8 h-8 animate-spin text-[#B8FF3C] mb-3" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                <p className="text-sm font-medium text-gray-200">Connecting...</p>
                <p className="text-[10px] text-gray-500 mt-1">Confirm in your wallet</p>
              </div>
            )}

            {/* Connected state - show address then exchange selector */}
            {walletState === 'connected' && (
              <div className="animate-fadeSlideDown">
                {/* Wallet address */}
                <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-guardian-500/10 border border-guardian-500/20">
                  <svg className="w-4 h-4 text-guardian-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs font-mono text-guardian-300">0x7a3B...4f2D</span>
                  <span className="text-[10px] text-guardian-400 font-medium ml-auto">Connected</span>
                </div>

                {/* Now connect exchange */}
                <p className="text-[11px] text-gray-400 mb-3 font-medium">Now connect your exchange</p>

                {/* Exchange Options */}
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
              </div>
            )}

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-guardian-500/10 border border-guardian-500/20 text-[10px] text-guardian-400 font-medium">
                <ShieldIcon /> Non-custodial
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-[10px] text-[#B8FF3C] font-medium">
                <KeyIcon /> Trade-only
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-oracle-500/10 border border-oracle-500/20 text-[10px] text-oracle-400 font-medium">
                <LockIcon /> Encrypted
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-medium">
                <LockIcon /> Smart Contract Payments
              </div>
            </div>

            {/* Connect Button - only show when wallet connected and exchange selected */}
            {walletState === 'connected' && (
              <button
                onClick={handleConnect}
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

            <button onClick={handleSkipDemo} className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
              Enter Demo Arena
            </button>
          </div>
        </div>

        {/* Bottom: Agent Live Forum - visible to ALL users */}
        <div className="flex-1">
          <LiveAgentFeed maxHeight="calc(100vh - 500px)" />
        </div>

        {/* Animation keyframes */}
        <style jsx>{`
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
        `}</style>
      </div>
    );
  }

  // ==================================================================
  // STATE 2: EXCHANGE CONNECTED - FULL DASHBOARD
  // ==================================================================

  return (
    <div className="space-y-8 relative">

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <Badge status="warning" dot size="sm">You&apos;re in the demo arena</Badge>
            <span className="text-xs text-gray-400">Connect wallet to go live</span>
          </div>
          <button
            onClick={() => { setExchangeConnected(false); setConnectingState('idle'); setWalletState('select'); setSelectedWallet(''); }}
            className="text-xs font-medium text-[#B8FF3C] hover:brightness-110 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Profit Trigger Banner */}
      {showProfitBanner && <ProfitTriggerBanner />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of your trading agents and portfolio</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BalanceIcon />}
          label="Total Balance"
          value="$47,283.50"
          trend={{ value: '12.5% from last month', direction: 'up' }}
        />
        <StatCard
          icon={<PnlIcon />}
          label="24h Profit/Loss"
          value="+$1,247.30"
          valueColor="text-guardian-400"
          trend={{ value: '3.2%', direction: 'up' }}
        />
        <StatCard
          icon={<AgentsIcon />}
          label="Active Agents"
          value="3"
          trend={{ value: '1 paused', direction: 'down' }}
        />
        <StatCard
          icon={<TradesIcon />}
          label="Total Trades"
          value="847"
          trend={{ value: '23 today', direction: 'up' }}
        />
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
            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-guardian-500/10 border border-guardian-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-guardian-400 animate-pulse" />
              <span className="text-[10px] text-guardian-400 font-medium">ONLINE</span>
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
            messagesEndRef={drawerMessagesEndRef}
            className="h-[280px]"
            inputPlaceholder="Tell me your trading goals..."
          />
        </div>
      </section>

      {/* Your Agents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Your Agents</h2>
          <Link href="/dashboard/agents" className="text-sm text-[#B8FF3C] hover:text-[#B8FF3C] transition-colors">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* Agent Comms + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <LiveAgentFeed />
        </section>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">Trade Log</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-guardian-400 animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-2 max-h-[520px] overflow-y-auto scrollbar-thin">
            <ActivityFeed items={mockActivities} />
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            href="/dashboard/build"
            title="Create Agent"
            description="Build and deploy a new AI trading agent"
            gradient="hover:border-[#B8FF3C]/30"
          />
          <QuickActionCard
            href="/dashboard/settings"
            title="Connect Exchange"
            description="Link your exchange API for live trading"
            gradient="hover:border-guardian-500/30"
          />
          <QuickActionCard
            href="/dashboard/marketplace"
            title="Browse Marketplace"
            description="Discover top-performing community agents"
            gradient="hover:border-oracle-500/30"
          />
          <ReferralCard />
        </div>
      </section>

      {/* ============================================ */}
      {/* AI Chat Floating Button + Drawer            */}
      {/* ============================================ */}

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-[#B8FF3C] text-black flex items-center justify-center shadow-2xl shadow-[#B8FF3C]/20 hover:shadow-[#B8FF3C]/40 hover:scale-105 transition-all duration-200"
        >
          <ChatBubbleIcon />
        </button>
      )}

      {/* Chat Drawer */}
      {chatOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setChatOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[400px] h-[100dvh] sm:h-[560px] sm:bottom-6 sm:right-6 rounded-none sm:rounded-2xl border border-[#1e1e2e] bg-[#0e0e16]/95 backdrop-blur-xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-slideUp">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#B8FF3C] flex items-center justify-center shadow-lg shadow-[#B8FF3C]/15">
                  <span className="text-xs font-bold text-black">C</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-100">Cladex AI</h3>
                  <p className="text-[10px] text-gray-500">Trading assistant</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all"
              >
                <CloseIcon />
              </button>
            </div>

            <ChatPanel
              messages={chatMessages.length > 0 ? chatMessages : [{
                id: 'drawer-welcome',
                role: 'ai',
                text: "Hey! I'm your Cladex AI assistant. Ask me about your portfolio, agents, or trading strategies.",
              }]}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={() => sendMessage()}
              isTyping={isTyping}
              messagesEndRef={drawerMessagesEndRef}
              className="flex-1 min-h-0"
              inputPlaceholder="Ask about agents, trades, portfolio..."
            />
          </div>
        </>
      )}

      {/* Drawer animation */}
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
