'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield, BarChart3, Target, Eye, Rocket, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { AgentPersonality } from '@/types';

// ---- Types ----

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AgentDraft {
  name: string;
  personality: AgentPersonality;
  riskLevel: number;
  assets: string[];
  strategy: string;
}

// ---- Personality configs ----

const PERSONALITIES: {
  id: AgentPersonality;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  ring: string;
}[] = [
  {
    id: 'guardian',
    label: 'Guardian',
    description: 'Conservative, protects capital',
    icon: <Shield size={20} />,
    color: 'text-guardian-400',
    border: 'border-guardian-500/40',
    bg: 'bg-guardian-500/10',
    ring: 'ring-guardian-500/50',
  },
  {
    id: 'analyst',
    label: 'Analyst',
    description: 'Data-driven, balanced',
    icon: <BarChart3 size={20} />,
    color: 'text-analyst-400',
    border: 'border-analyst-500/40',
    bg: 'bg-analyst-500/10',
    ring: 'ring-analyst-500/50',
  },
  {
    id: 'hunter',
    label: 'Hunter',
    description: 'Aggressive, high reward',
    icon: <Target size={20} />,
    color: 'text-hunter-400',
    border: 'border-hunter-500/40',
    bg: 'bg-hunter-500/10',
    ring: 'ring-hunter-500/50',
  },
  {
    id: 'oracle',
    label: 'Oracle',
    description: 'Predictive, pattern-based',
    icon: <Eye size={20} />,
    color: 'text-oracle-400',
    border: 'border-oracle-500/40',
    bg: 'bg-oracle-500/10',
    ring: 'ring-oracle-500/50',
  },
];

const AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC'];

// ---- Mock AI responses ----

function getMockResponse(userMessage: string): { text: string; config: Partial<AgentDraft> } {
  const lower = userMessage.toLowerCase();

  if (lower.includes('degen')) {
    return {
      text: "Let's go full degen! I'll set up a Hunter agent that apes into momentum plays on altcoins. High risk, high reward. It'll chase breakouts and ride them hard. Not for the faint-hearted! Risk level: 9/10.",
      config: {
        name: 'Degen Alpha',
        personality: 'hunter',
        riskLevel: 9,
        assets: ['SOL', 'AVAX', 'LINK', 'MATIC'],
        strategy: 'Full degen momentum strategy. Apes into volume spikes on altcoins with 5x-10x leverage. Chases breakouts aggressively. Wide take-profits at 20% with trailing stops. Exits on first sign of weakness.',
      },
    };
  }

  if (lower.includes('boring') || lower.includes('safe') || lower.includes('conservative') || lower.includes('low risk')) {
    return {
      text: "Great choice! I'll set up a Guardian-style agent focused on capital preservation. It will use dollar-cost averaging on blue-chip assets like BTC and ETH, with tight stop-losses and conservative position sizing. Risk level set to 3/10 for maximum safety.",
      config: {
        name: 'Safe Harbor Bot',
        personality: 'guardian',
        riskLevel: 3,
        assets: ['BTC', 'ETH'],
        strategy: 'Dollar-cost averaging on blue-chip cryptocurrencies with tight stop-losses at 3%. Prioritizes capital preservation with small, consistent position sizes. Buys dips when RSI < 30.',
      },
    };
  }

  if (lower.includes('10x') || lower.includes('gem')) {
    return {
      text: "Gem hunting mode activated! I'll build an Oracle agent that scans for low-cap tokens with explosive potential. It uses on-chain data, whale tracking, and social sentiment to find the next 10x before the crowd. Risk level: 7/10.",
      config: {
        name: 'Gem Scanner',
        personality: 'oracle',
        riskLevel: 7,
        assets: ['SOL', 'AVAX', 'DOT', 'LINK'],
        strategy: 'Gem hunting strategy using on-chain whale tracking, social sentiment analysis, and volume anomaly detection on low-cap altcoins. Enters early accumulation phases. Takes profit in stages at 3x, 5x, and 10x.',
      },
    };
  }

  if (lower.includes('whale')) {
    return {
      text: "Trade like a whale? Say no more. I'll create an Analyst agent that mirrors whale wallet behavior. It tracks large wallet movements, institutional flows, and smart money positioning to ride the big moves. Risk level: 6/10.",
      config: {
        name: 'Whale Mirror',
        personality: 'analyst',
        riskLevel: 6,
        assets: ['BTC', 'ETH', 'SOL'],
        strategy: 'Whale-mirroring strategy tracking top 100 wallet movements, institutional order flow, and smart money accumulation patterns. Enters positions when multiple whale wallets align. Scales in/out with whale activity.',
      },
    };
  }

  if (lower.includes('aggressive') || lower.includes('high reward') || lower.includes('moon')) {
    return {
      text: "You want to go big! I'll configure a Hunter agent that aggressively trades altcoins. It will hunt for momentum breakouts and ride trends hard. Higher risk, but the potential returns are significant. Risk level: 8/10.",
      config: {
        name: 'Alpha Predator',
        personality: 'hunter',
        riskLevel: 8,
        assets: ['SOL', 'AVAX', 'LINK', 'MATIC'],
        strategy: 'Momentum breakout strategy on high-volatility altcoins. Enters on volume spikes with 5x leverage. Wide take-profits at 15% with trailing stops. Scales into winning positions aggressively.',
      },
    };
  }

  if (lower.includes('data') || lower.includes('analysis') || lower.includes('balanced')) {
    return {
      text: "A balanced approach is wise. I'll create an Analyst agent that uses multiple technical indicators and on-chain data to make informed decisions. Medium risk with a focus on risk-adjusted returns.",
      config: {
        name: 'Data Cruncher',
        personality: 'analyst',
        riskLevel: 5,
        assets: ['BTC', 'ETH', 'SOL'],
        strategy: 'Multi-indicator strategy combining RSI, MACD, and volume analysis with on-chain metrics. Enters positions when 3+ indicators align. Risk-reward ratio minimum 1:2.',
      },
    };
  }

  if (lower.includes('predict') || lower.includes('pattern') || lower.includes('ai')) {
    return {
      text: "Interesting! I'll build an Oracle agent that uses pattern recognition and predictive modeling. It analyzes historical cycles, whale movements, and market structure to anticipate moves before they happen.",
      config: {
        name: 'Crystal Vision',
        personality: 'oracle',
        riskLevel: 6,
        assets: ['BTC', 'ETH', 'SOL', 'DOT'],
        strategy: 'Predictive model combining fractal analysis, whale wallet tracking, and market cycle theory. Identifies accumulation zones and distribution phases. Adjusts exposure based on confidence score.',
      },
    };
  }

  // Default
  return {
    text: "I understand! Let me suggest a well-rounded Analyst agent to start. It combines technical analysis with smart risk management. You can customize the personality, risk level, and assets in the panel on the right. What aspects would you like to adjust?",
    config: {
      name: 'My Trading Agent',
      personality: 'analyst',
      riskLevel: 5,
      assets: ['BTC', 'ETH'],
      strategy: 'Balanced trading strategy using technical indicators and market sentiment analysis. Targets swing trades with 1-5 day holding periods. Dynamic position sizing based on volatility.',
    },
  };
}

// ---- Thinking dots animation ----

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-1">
      <div className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// ---- Confetti particles ----

function ConfettiOverlay() {
  const colors = ['#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#06b6d4'];
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size > 7 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation-name: confetti;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}

// ---- Main Page ----

export default function AgentBuilderPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-1',
      role: 'system',
      content: "Hi! I'm your agent builder. Tell me what kind of trading strategy you want, and I'll create an agent for you.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasFreeAgent, setHasFreeAgent] = useState(true);
  const [draft, setDraft] = useState<AgentDraft>({
    name: 'My Trading Agent',
    personality: 'analyst',
    riskLevel: 5,
    assets: ['BTC', 'ETH'],
    strategy: '',
  });
  const [isEditingName, setIsEditingName] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    setTimeout(() => {
      const { text: responseText, config } = getMockResponse(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setDraft((prev) => ({ ...prev, ...config }));
      setIsThinking(false);
    }, 1500 + Math.random() * 1000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleAsset(asset: string) {
    setDraft((prev) => ({
      ...prev,
      assets: prev.assets.includes(asset)
        ? prev.assets.filter((a) => a !== asset)
        : [...prev.assets, asset],
    }));
  }

  function handleDeploy() {
    setShowMintModal(true);
  }

  function handleMintConfirm() {
    setShowMintModal(false);
    setShowDeployModal(true);
    setShowConfetti(true);
    if (hasFreeAgent) setHasFreeAgent(false);
    setTimeout(() => setShowConfetti(false), 3500);
  }

  const riskColor =
    draft.riskLevel <= 3
      ? 'text-guardian-400'
      : draft.riskLevel <= 6
      ? 'text-amber-400'
      : 'text-hunter-400';

  const riskGradient =
    draft.riskLevel <= 3
      ? 'from-guardian-500 to-guardian-400'
      : draft.riskLevel <= 6
      ? 'from-guardian-500 via-amber-500 to-amber-400'
      : 'from-guardian-500 via-amber-500 to-hunter-500';

  const selectedPersonality = PERSONALITIES.find((p) => p.id === draft.personality)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {showConfetti && <ConfettiOverlay />}

      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8FF3C] flex items-center justify-center">
              <Sparkles size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Agent Builder</h1>
              <p className="text-xs text-gray-500">Describe your strategy, we build the agent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-120px)]">
          {/* Left: Chat Interface */}
          <div className="w-full lg:w-[60%] flex flex-col bg-[#111118] rounded-2xl border border-[#1e1e2e] overflow-hidden min-h-[400px] lg:min-h-0">
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-[#B8FF3C]/10 text-gray-100 border border-[#B8FF3C]/20'
                        : msg.role === 'system'
                        ? 'bg-[#1a1a25] text-gray-300 border border-[#2a2a3a]'
                        : 'bg-[#1a1a25] text-gray-200 border border-[#2a2a3a]',
                    ].join(' ')}
                  >
                    {msg.role === 'system' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[#B8FF3C]" />
                        <span className="text-xs font-medium text-[#B8FF3C]">Cladex Builder</span>
                      </div>
                    )}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[#B8FF3C]" />
                        <span className="text-xs font-medium text-[#B8FF3C]">Cladex Builder</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a25] text-gray-200 border border-[#2a2a3a] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-[#B8FF3C]" />
                      <span className="text-xs font-medium text-[#B8FF3C]">Cladex Builder</span>
                    </div>
                    <ThinkingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestion chips */}
            {messages.length === 1 && (
              <div className="px-6 pb-3 flex flex-wrap gap-2">
                {[
                  'Make me a degen trader',
                  'I want safe boring growth',
                  'Find me 10x gems',
                  'Trade like a whale',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full border border-[#2a2a3a] bg-[#1a1a25] text-gray-400 hover:text-gray-200 hover:border-[#B8FF3C]/30 hover:bg-[#B8FF3C]/5 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="p-4 border-t border-[#1e1e2e]">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your trading strategy..."
                  className="flex-1 bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
                  disabled={isThinking}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking}
                  size="lg"
                  icon={<Send size={18} />}
                  className="shrink-0"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Agent Preview Panel */}
          <div className="w-full lg:w-[40%] overflow-y-auto space-y-5">
            <Card className="bg-[#111118] border-[#1e1e2e]" padding="lg">
              <div className="flex items-center gap-2 mb-5">
                <Rocket size={18} className="text-[#B8FF3C]" />
                <h2 className="text-base font-semibold text-white">Agent Preview</h2>
              </div>

              {/* Agent Name */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                  Agent Name
                </label>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                      autoFocus
                      className="flex-1 bg-[#0a0a0f] border border-[#B8FF3C]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#B8FF3C]/30"
                    />
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] hover:border-[#B8FF3C]/30 text-white text-sm transition-all"
                  >
                    {draft.name}
                    <span className="text-gray-600 text-xs ml-2">click to edit</span>
                  </button>
                )}
              </div>

              {/* Personality Selector */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Personality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setDraft((prev) => ({ ...prev, personality: p.id }))}
                      className={[
                        'flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 text-left',
                        draft.personality === p.id
                          ? `${p.bg} ${p.border} ring-1 ${p.ring}`
                          : 'bg-[#0a0a0f] border-[#2a2a3a] hover:border-[#3a3a4a]',
                      ].join(' ')}
                    >
                      <div className={`${p.color} shrink-0`}>{p.icon}</div>
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${draft.personality === p.id ? p.color : 'text-gray-200'}`}>
                          {p.label}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{p.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Level Slider */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Risk Level
                </label>
                <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">Conservative</span>
                    <span className={`text-lg font-bold ${riskColor}`}>{draft.riskLevel}/10</span>
                    <span className="text-xs text-gray-500">Aggressive</span>
                  </div>
                  <div className="relative">
                    <div className="w-full h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${riskGradient} transition-all duration-300`}
                        style={{ width: `${draft.riskLevel * 10}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={draft.riskLevel}
                      onChange={(e) => setDraft((prev) => ({ ...prev, riskLevel: Number(e.target.value) }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Chips */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Trading Assets
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ASSETS.map((asset) => {
                    const selected = draft.assets.includes(asset);
                    return (
                      <button
                        key={asset}
                        onClick={() => toggleAsset(asset)}
                        className={[
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
                          selected
                            ? `${selectedPersonality.bg} ${selectedPersonality.border} ${selectedPersonality.color}`
                            : 'bg-[#0a0a0f] border-[#2a2a3a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a4a]',
                        ].join(' ')}
                      >
                        {asset}
                        {selected && <X size={12} className="inline ml-1 -mr-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strategy Summary */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Strategy Summary
                </label>
                <textarea
                  value={draft.strategy}
                  onChange={(e) => setDraft((prev) => ({ ...prev, strategy: e.target.value }))}
                  rows={4}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all resize-none"
                  placeholder="Strategy details will appear here as you chat..."
                />
              </div>

              {/* Deploy Button */}
              <Button
                onClick={handleDeploy}
                size="lg"
                fullWidth
                icon={<Rocket size={18} />}
                disabled={!draft.strategy || draft.assets.length === 0}
                className="bg-[#B8FF3C] hover:brightness-110 text-black text-base font-bold py-3.5"
              >
                Deploy Agent
              </Button>
            </Card>

            {/* Quick stats preview */}
            <Card className="bg-[#111118] border-[#1e1e2e]" padding="md">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Personality</div>
                  <Badge variant={draft.personality} size="sm" dot>
                    {selectedPersonality.label}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Assets</div>
                  <div className="text-sm font-semibold text-white">{draft.assets.length}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Risk</div>
                  <div className={`text-sm font-semibold ${riskColor}`}>
                    {draft.riskLevel <= 3 ? 'Low' : draft.riskLevel <= 6 ? 'Medium' : 'High'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mint Confirmation Modal */}
      <Modal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        title="Mint Your Agent"
        size="md"
      >
        <div className="py-4">
          <p className="text-sm text-gray-400 text-center mb-5">Deploy <span className="text-white font-semibold">{draft.name}</span> on-chain</p>

          {/* Agent preview */}
          <div className="bg-[#0a0a0f] rounded-xl p-4 border border-[#2a2a3a] mb-5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Name</span>
              <span className="text-white font-medium">{draft.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Personality</span>
              <Badge variant={draft.personality} size="sm">{selectedPersonality.label}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Strategy</span>
              <span className="text-gray-300 text-right max-w-[200px] truncate">{draft.strategy || 'Custom strategy'}</span>
            </div>
          </div>

          {/* Price section */}
          <div className="bg-[#0a0a0f] rounded-xl p-4 border border-[#2a2a3a] mb-5 text-center">
            {hasFreeAgent ? (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-guardian-500/15 border border-guardian-500/30 mb-2">
                  <span className="text-guardian-400 font-bold text-sm">FREE</span>
                </div>
                <p className="text-xs text-gray-400">Your first agent deployment</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-white font-bold text-lg">$20</span>
                  <span className="text-xs text-gray-500">Mint Fee</span>
                  <span className="text-xs text-gray-600 line-through">$100</span>
                </div>
                <p className="text-xs text-gray-400">Early access pricing</p>
              </div>
            )}
          </div>

          {/* Mint button */}
          <Button
            onClick={handleMintConfirm}
            size="lg"
            fullWidth
            icon={<Rocket size={18} />}
            className="bg-[#B8FF3C] hover:brightness-110 text-black text-base font-bold py-3.5 mb-4"
          >
            Mint via Smart Contract
          </Button>

          <p className="text-[11px] text-gray-500 text-center mb-1">Your agent will be stored as an NFT you own forever</p>
          <p className="text-[11px] text-gray-500 text-center">Powered by Base network</p>
        </div>
      </Modal>

      {/* Deploy Success Modal */}
      <Modal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        title="Agent Minted!"
        size="md"
      >
        <div className="text-center py-4">
          <div className="text-4xl mb-3">{'\uD83C\uDF89'}</div>
          <h3 className="text-lg font-bold text-white mb-2">Agent minted successfully!</h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8FF3C]/10 border border-[#B8FF3C]/30 mb-4">
            <span className="text-[#B8FF3C] font-bold text-sm">+100 CP earned</span>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Your {selectedPersonality.label} agent <span className="text-white font-medium">{draft.name}</span> is now on-chain and actively monitoring the market.
          </p>
          <div className="bg-[#0a0a0f] rounded-xl p-4 border border-[#2a2a3a] mb-5 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Personality</span>
              <Badge variant={draft.personality} size="sm">{selectedPersonality.label}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Risk Level</span>
              <span className={riskColor}>{draft.riskLevel}/10</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Assets</span>
              <span className="text-gray-200">{draft.assets.join(', ')}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowDeployModal(false)}>
              Build Another
            </Button>
            <Button fullWidth onClick={() => setShowDeployModal(false)}>
              View Agent
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
