'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Shield, BarChart3, Target, Eye, Rocket, Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { getDeployedAgents, addDeployedAgent } from '@/lib/agents-store';
import type { AgentPersonality } from '@/types';
import { api } from '@/lib/api';

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
    id: 'nova',
    label: 'Nova',
    description: 'Conservative, protects capital',
    icon: <Shield size={20} />,
    color: 'text-nova-400',
    border: 'border-nova-500/40',
    bg: 'bg-nova-500/10',
    ring: 'ring-nova-500/50',
  },
  {
    id: 'sage',
    label: 'Sage',
    description: 'Data-driven, balanced',
    icon: <BarChart3 size={20} />,
    color: 'text-sage-400',
    border: 'border-sage-500/40',
    bg: 'bg-sage-500/10',
    ring: 'ring-sage-500/50',
  },
  {
    id: 'apex',
    label: 'Apex',
    description: 'Aggressive, high reward',
    icon: <Target size={20} />,
    color: 'text-apex-400',
    border: 'border-apex-500/40',
    bg: 'bg-apex-500/10',
    ring: 'ring-apex-500/50',
  },
  {
    id: 'echo',
    label: 'Echo',
    description: 'Predictive, pattern-based',
    icon: <Eye size={20} />,
    color: 'text-echo-400',
    border: 'border-echo-500/40',
    bg: 'bg-echo-500/10',
    ring: 'ring-echo-500/50',
  },
];

const AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'LINK', 'MATIC'];

// ---- Strategy configs ----

const STRATEGIES: {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  ring: string;
}[] = [
  {
    id: 'safeflow',
    label: 'SafeFlow',
    description: 'Capital preservation — buys dips in uptrends',
    icon: <Shield size={20} />,
    color: 'text-nova-400',
    border: 'border-nova-500/40',
    bg: 'bg-nova-500/10',
    ring: 'ring-nova-500/50',
  },
  {
    id: 'trend_pro',
    label: 'TrendPro',
    description: 'Momentum — rides strong trends',
    icon: <BarChart3 size={20} />,
    color: 'text-sage-400',
    border: 'border-sage-500/40',
    bg: 'bg-sage-500/10',
    ring: 'ring-sage-500/50',
  },
  {
    id: 'beast_mode',
    label: 'Beast Mode',
    description: 'Breakout hunter — catches explosive moves',
    icon: <Target size={20} />,
    color: 'text-apex-400',
    border: 'border-apex-500/40',
    bg: 'bg-apex-500/10',
    ring: 'ring-apex-500/50',
  },
  {
    id: 'dca',
    label: 'DCA',
    description: 'Simple periodic buying',
    icon: <RefreshCw size={20} />,
    color: 'text-gray-400',
    border: 'border-gray-500/40',
    bg: 'bg-gray-500/10',
    ring: 'ring-gray-500/50',
  },
];

const PERSONALITY_STRATEGY_MAP: Record<AgentPersonality, string> = {
  nova: 'safeflow',
  sage: 'trend_pro',
  apex: 'beast_mode',
  echo: 'trend_pro',
};


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
  const [showConfetti, setShowConfetti] = useState(false);
  const [draft, setDraft] = useState<AgentDraft>({
    name: 'My Trading Agent',
    personality: 'sage',
    riskLevel: 5,
    assets: ['BTC', 'ETH'],
    strategy: '',
  });
  const [selectedStrategy, setSelectedStrategy] = useState('safeflow');
  const [isEditingName, setIsEditingName] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore agent draft if returning from pricing page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedDraft = localStorage.getItem('cladex_agent_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft) as AgentDraft;
        setDraft(parsed);
        localStorage.removeItem('cladex_agent_draft');
        // Add a welcome-back message
        setMessages(prev => [...prev, {
          id: `system-restored-${Date.now()}`,
          role: 'system' as const,
          content: `Welcome back! Your agent "${parsed.name}" is ready to deploy. Click Deploy Agent to continue.`,
          timestamp: new Date(),
        }]);
      } catch {
        localStorage.removeItem('cladex_agent_draft');
      }
    }
  }, []);

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

    (async () => {
      try {
        const data = await api.post<{ agentConfig: { name: string; personality: string; strategy: Record<string, unknown>; riskLevel: string; assets: string[] } }>('/ai/generate-agent', { prompt: text });
        const config = data.agentConfig;
        const riskMap: Record<string, number> = { LOW: 3, MEDIUM: 5, HIGH: 8 };
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `I've configured "${config.name}" — a ${config.personality} agent trading ${config.assets.join(', ')} with ${config.riskLevel.toLowerCase()} risk. ${(config.strategy as any)?.description || 'Ready to deploy.'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        const newPersonality = (config.personality?.toLowerCase() || 'sage') as AgentPersonality;
        setDraft((prev) => ({
          ...prev,
          name: config.name,
          personality: newPersonality,
          riskLevel: riskMap[config.riskLevel] || 5,
          assets: config.assets,
          strategy: (config.strategy as any)?.description || JSON.stringify(config.strategy),
        }));
        // Auto-select strategy: prefer AI-returned type, fall back to personality mapping
        const aiStrategyType = (config.strategy as any)?.type;
        if (aiStrategyType && STRATEGIES.some((s) => s.id === aiStrategyType)) {
          setSelectedStrategy(aiStrategyType);
        } else {
          setSelectedStrategy(PERSONALITY_STRATEGY_MAP[newPersonality]);
        }
      } catch {
        // Fallback message if AI fails
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'AI is temporarily unavailable. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
      setIsThinking(false);
    })();
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

  const PLAN_LIMITS: Record<string, number> = { Trader: 2, Builder: 5, 'Pro Creator': 15 };

  function getUserPlan(): string | null {
    if (typeof window === 'undefined') return null;
    const agents = getDeployedAgents();
    if (agents.length === 0) return null;
    return agents[0]?.plan || null;
  }

  function getAgentCount(): number {
    return getDeployedAgents().length;
  }

  const [isDeploying, setIsDeploying] = useState(false);

  async function handleDeploy() {
    if (!draft.name.trim() || draft.name.trim().length < 2 || !draft.strategy || draft.assets.length === 0) {
      return;
    }

    const plan = getUserPlan();
    if (!plan) {
      // No plan — save draft and go to pricing with return URL
      if (typeof window !== 'undefined') {
        localStorage.setItem('cladex_agent_draft', JSON.stringify(draft));
      }
      window.location.href = '/pricing?return=build';
      return;
    }

    const limit = PLAN_LIMITS[plan] || 2;
    const count = getAgentCount();

    if (count >= limit) {
      // Hit limit — show upgrade
      setShowDeployModal(false);
      alert(`You've reached your ${plan} plan limit (${limit} agents). Upgrade your plan for more agent slots.`);
      window.location.href = '/pricing';
      return;
    }

    if (isDeploying) return;
    setIsDeploying(true);

    // Map risk level to backend enum
    const riskLevelMap = (level: number): string => {
      if (level <= 3) return 'LOW';
      if (level <= 6) return 'MEDIUM';
      return 'HIGH';
    };

    try {
      // Call backend API to create agent
      const data = await api.post<{ agent: Record<string, unknown> }>('/agents', {
        name: draft.name,
        personality: draft.personality.toUpperCase(),
        strategy: JSON.stringify({ type: selectedStrategy, description: draft.strategy, assets: draft.assets }),
        riskLevel: riskLevelMap(draft.riskLevel),
        assets: draft.assets,
      });

      const backendAgent = data.agent;

      // Also add to localStorage for immediate local access
      addDeployedAgent({
        id: (backendAgent?.id as string) || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: draft.name,
        personality: draft.personality,
        status: 'pending',
        plan,
        walletAddress: localStorage.getItem('cladex_connected_wallet') ? JSON.parse(localStorage.getItem('cladex_connected_wallet')!).address : null,
        deployMethod: localStorage.getItem('cladex_connected_wallet') ? 'wallet' : 'gas-balance',
        pnl: 0,
        pnlPercent: 0,
        totalTrades: 0,
        winRate: 0,
        assets: draft.assets,
        createdAt: Date.now(),
        strategy: draft.strategy,
      });

      setShowDeployModal(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    } catch {
      // Fallback: save to localStorage only if API fails
      addDeployedAgent({
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: draft.name,
        personality: draft.personality,
        status: 'pending',
        plan,
        walletAddress: localStorage.getItem('cladex_connected_wallet') ? JSON.parse(localStorage.getItem('cladex_connected_wallet')!).address : null,
        deployMethod: localStorage.getItem('cladex_connected_wallet') ? 'wallet' : 'gas-balance',
        pnl: 0,
        pnlPercent: 0,
        totalTrades: 0,
        winRate: 0,
        assets: draft.assets,
        createdAt: Date.now(),
        strategy: draft.strategy,
      });

      setShowDeployModal(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    } finally {
      setIsDeploying(false);
    }
  }

  const riskColor =
    draft.riskLevel <= 3
      ? 'text-nova-400'
      : draft.riskLevel <= 6
      ? 'text-amber-400'
      : 'text-apex-400';

  const riskGradient =
    draft.riskLevel <= 3
      ? 'from-nova-500 to-nova-400'
      : draft.riskLevel <= 6
      ? 'from-nova-500 via-amber-500 to-amber-400'
      : 'from-nova-500 via-amber-500 to-apex-500';

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
                      'max-w-[92%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, personality: p.id }));
                        setSelectedStrategy(PERSONALITY_STRATEGY_MAP[p.id]);
                      }}
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

              {/* Strategy Selector */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STRATEGIES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStrategy(s.id)}
                      className={[
                        'flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 text-left',
                        selectedStrategy === s.id
                          ? `${s.bg} ${s.border} ring-1 ${s.ring}`
                          : 'bg-[#0a0a0f] border-[#2a2a3a] hover:border-[#3a3a4a]',
                      ].join(' ')}
                    >
                      <div className={`${s.color} shrink-0`}>{s.icon}</div>
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${selectedStrategy === s.id ? s.color : 'text-gray-200'}`}>
                          {s.label}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{s.description}</div>
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
                disabled={!draft.name.trim() || draft.name.trim().length < 2 || !draft.strategy || draft.assets.length === 0 || isDeploying}
                loading={isDeploying}
                className="bg-[#B8FF3C] hover:brightness-110 text-black text-base font-bold py-3.5"
              >
                {isDeploying ? 'Deploying...' : getUserPlan() ? `Deploy ${draft.name}` : 'Get Plan & Deploy'}
              </Button>
              {getUserPlan() && (
                <p className="text-[10px] text-gray-500 text-center mt-1.5">
                  {getUserPlan()} plan · {getAgentCount()}/{PLAN_LIMITS[getUserPlan()!] || 2} agents used
                </p>
              )}
            </Card>

            {/* Quick stats preview */}
            <Card className="bg-[#111118] border-[#1e1e2e]" padding="md">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
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
            <span className="text-[#B8FF3C] font-bold text-sm">+100 $CLDX earned</span>
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
            <Button fullWidth onClick={() => { setShowDeployModal(false); window.location.href = '/dashboard/agents'; }}>
              View Agent
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
