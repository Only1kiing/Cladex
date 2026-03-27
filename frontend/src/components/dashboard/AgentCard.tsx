'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from './AgentAvatar';
import type { AgentPersonality, AgentStatus } from '@/types';

// ---- Types ----

interface IntelligenceStory {
  currentState: string;
  recentActions: string[];
  strategy: string;
  nextMove: string;
}

interface AgentCardAgent {
  id: string;
  name: string;
  personality: AgentPersonality;
  status: AgentStatus;
  pnl: number;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  sparkline: number[];
  story?: IntelligenceStory;
}

interface AgentCardProps {
  agent: AgentCardAgent;
  className?: string;
}

// ---- Personality config ----

const personalityBorderColors: Record<AgentPersonality, string> = {
  guardian: 'border-t-guardian-500',
  analyst: 'border-t-analyst-500',
  hunter: 'border-t-hunter-500',
  oracle: 'border-t-oracle-500',
};

const personalityGlow: Record<AgentPersonality, string> = {
  guardian: 'shadow-guardian-500/8',
  analyst: 'shadow-analyst-500/8',
  hunter: 'shadow-hunter-500/8',
  oracle: 'shadow-oracle-500/8',
};

const personalityGlowHover: Record<AgentPersonality, string> = {
  guardian: 'hover:shadow-guardian-500/20',
  analyst: 'hover:shadow-analyst-500/20',
  hunter: 'hover:shadow-hunter-500/20',
  oracle: 'hover:shadow-oracle-500/20',
};

const personalityAccent: Record<AgentPersonality, string> = {
  guardian: 'text-guardian-400',
  analyst: 'text-analyst-400',
  hunter: 'text-hunter-400',
  oracle: 'text-oracle-400',
};

const personalityAccentBg: Record<AgentPersonality, string> = {
  guardian: 'bg-guardian-500/10 border-guardian-500/20',
  analyst: 'bg-analyst-500/10 border-analyst-500/20',
  hunter: 'bg-hunter-500/10 border-hunter-500/20',
  oracle: 'bg-oracle-500/10 border-oracle-500/20',
};

const personalityLabels: Record<AgentPersonality, string> = {
  guardian: 'Guardian',
  analyst: 'Analyst',
  hunter: 'Hunter',
  oracle: 'Oracle',
};

const personalityIconBg: Record<AgentPersonality, string> = {
  guardian: 'bg-guardian-500/15 text-guardian-400',
  analyst: 'bg-analyst-500/15 text-analyst-400',
  hunter: 'bg-hunter-500/15 text-hunter-400',
  oracle: 'bg-oracle-500/15 text-oracle-400',
};

const statusLabels: Record<AgentStatus, string> = {
  active: 'Running',
  paused: 'Paused',
  stopped: 'Stopped',
  error: 'Error',
};

const statusBadgeStatus: Record<AgentStatus, 'active' | 'inactive' | 'warning' | 'error'> = {
  active: 'active',
  paused: 'warning',
  stopped: 'inactive',
  error: 'error',
};

// ---- Default stories per personality ----

const defaultStories: Record<AgentPersonality, IntelligenceStory> = {
  guardian: {
    currentState: 'I am maintaining a defensive posture, carefully watching for signs of market weakness. My shields are up and your capital is well-protected. Current drawdown is minimal at 1.2%.',
    recentActions: [
      'Secured partial profits on BTC after detecting overbought conditions on the 4H timeframe',
      'Tightened stop-losses across all positions as volatility increased by 15%',
      'Rejected a potential ETH entry — risk-reward ratio didn\'t meet my 3:1 threshold',
    ],
    strategy: 'Conservative capital preservation with strategic DCA entries during high-conviction dips. I prioritize protecting your wealth over chasing gains.',
    nextMove: 'Watching the $66,800 BTC support level closely. If it holds with strong volume, I\'ll add a small position. Otherwise, I\'ll keep our powder dry.',
  },
  analyst: {
    currentState: 'Running multi-timeframe analysis across 12 indicators. The data is painting an interesting picture — several confluence zones are forming. Confidence level: 78%.',
    recentActions: [
      'Identified a bullish divergence on ETH/USDT that led to a successful 4.2% swing trade',
      'Cross-referenced on-chain data with technical patterns — whale accumulation confirmed',
      'Adjusted position sizing algorithm based on 30-day volatility regression',
    ],
    strategy: 'Data-driven trend following using SMA crossovers, RSI divergence, and volume profile analysis. Every decision is backed by at least 3 confirming signals.',
    nextMove: 'The 50-day MA is about to cross above the 200-day on BTC. If volume confirms, I\'ll scale into a larger position over the next 48 hours.',
  },
  hunter: {
    currentState: 'Stalking three high-potential setups across altcoin markets. Adrenaline is high — I can smell a breakout forming. Locked and loaded.',
    recentActions: [
      'Captured a 12% move on SOL after catching the momentum breakout at $145',
      'Cut a losing AVAX trade quickly — down only 1.3% instead of letting it bleed',
      'Deployed a rapid-fire scalping sequence on LINK during a volatility spike',
    ],
    strategy: 'Aggressive momentum hunting with tight risk management. I strike fast on breakouts and cut losses faster. High frequency, high conviction.',
    nextMove: 'AVAX is coiling in a tight range near resistance. When it breaks, I\'m going in heavy with a 5% portfolio allocation. Stop-loss already calculated.',
  },
  oracle: {
    currentState: 'My pattern recognition models are detecting an unusual convergence of signals. Historical analysis suggests a significant move within 72 hours. Probability: 82%.',
    recentActions: [
      'Predicted the BTC pullback to $67,200 within $50 accuracy — position adjusted 6 hours before the drop',
      'Identified a rare fractal pattern matching March 2024 — preparing for similar outcome',
      'Updated my neural network weights based on the last 48 hours of market microstructure',
    ],
    strategy: 'AI-powered predictive modeling combining fractal analysis, sentiment scoring, and market microstructure patterns. I see what others can\'t.',
    nextMove: 'My models predict a liquidity sweep below $66,500 followed by an aggressive bounce to $69,000. I\'m positioning for the reversal with a layered limit order strategy.',
  },
};

// ---- Personality Icon ----

function PersonalityIcon({ personality, size = 'md' }: { personality: AgentPersonality; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const icons: Record<AgentPersonality, React.ReactNode> = {
    guardian: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    analyst: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    hunter: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    oracle: (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  };

  const wrapCls = size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-9 h-9 rounded-lg';
  return (
    <div className={`${wrapCls} flex items-center justify-center shrink-0 ${personalityIconBg[personality]}`}>
      {icons[personality]}
    </div>
  );
}

// ---- Breathing Glow Ring ----

function BreathingGlow({ personality, active }: { personality: AgentPersonality; active: boolean }) {
  if (!active) return null;
  const colors: Record<AgentPersonality, string> = {
    guardian: 'bg-guardian-500',
    analyst: 'bg-analyst-500',
    hunter: 'bg-hunter-500',
    oracle: 'bg-oracle-500',
  };
  return (
    <div className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
      <div className={`absolute inset-0 ${colors[personality]} opacity-[0.04] animate-pulse`} style={{ animationDuration: '3s' }} />
    </div>
  );
}

// ---- Mini Sparkline ----

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const pathD = points.reduce((acc, point, i) => (i === 0 ? `M ${point}` : `${acc} L ${point}`), '');
  const color = positive ? '#4ade80' : '#f87171';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${width - padding},${height} L ${padding},${height} Z`} fill={`url(#spark-${positive ? 'g' : 'r'})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Intelligence Story Dropdown ----

function IntelligenceStory({ story, personality, isOpen, onToggle }: {
  story: IntelligenceStory;
  personality: AgentPersonality;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const accent = personalityAccent[personality];
  const accentBg = personalityAccentBg[personality];

  return (
    <div className="mt-3">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-300 ${
          isOpen
            ? `${accentBg} ${accent}`
            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/[0.04] hover:text-gray-300'
        }`}
      >
        <span className="flex items-center gap-2 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          View Intelligence Story
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-500 ease-out ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight: height }}
      >
        <div ref={contentRef} className="pt-3 space-y-4">
          {/* Current State */}
          <div className={`rounded-lg border p-3 ${accentBg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${accent.replace('text-', 'bg-')} animate-pulse`} />
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${accent}`}>Current State</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed italic">&ldquo;{story.currentState}&rdquo;</p>
          </div>

          {/* Recent Actions */}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-500 mb-2 block">Recent Actions</span>
            <div className="space-y-2">
              {story.recentActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${accent.replace('text-', 'bg-')} opacity-60`} />
                  <p className="text-xs text-gray-400 leading-relaxed">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-500 mb-1.5 block">Strategy</span>
            <p className="text-xs text-gray-400 leading-relaxed">{story.strategy}</p>
          </div>

          {/* Next Move */}
          <div className={`rounded-lg border p-3 ${accentBg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className={`w-3.5 h-3.5 ${accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${accent}`}>Next Move</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{story.nextMove}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Agent Card ----

function AgentCard({ agent, className = '' }: AgentCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const isPositive = agent.pnl >= 0;
  const isRunning = agent.status === 'active';
  const story = agent.story || defaultStories[agent.personality];

  const handleToggle = () => {
    setIsToggling(true);
    setTimeout(() => setIsToggling(false), 500);
  };

  return (
    <div
      className={[
        'group relative rounded-xl border border-[#1e1e2e] border-t-2 bg-[#111118] p-5',
        'transition-all duration-500 ease-out',
        'hover:-translate-y-1 hover:border-white/[0.12]',
        `shadow-lg ${personalityGlow[agent.personality]} ${personalityGlowHover[agent.personality]}`,
        personalityBorderColors[agent.personality],
        className,
      ].join(' ')}
    >
      <BreathingGlow personality={agent.personality} active={isRunning} />

      {/* Avatar + Header */}
      <div className="relative flex flex-col items-center text-center mb-4">
        <div className="relative mb-2">
          <AgentAvatar personality={agent.personality} size={88} active={isRunning} />
        </div>
        <h3 className="text-base font-semibold text-gray-100 group-hover:text-white transition-colors duration-300">
          {agent.name}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant={agent.personality} size="sm">
            {personalityLabels[agent.personality]}
          </Badge>
          <Badge status={statusBadgeStatus[agent.status]} dot size="sm">
            {statusLabels[agent.status]}
          </Badge>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex justify-end mb-1">
        <MiniSparkline data={agent.sparkline} positive={isPositive} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Profit</p>
          <p className={`text-sm font-semibold mt-0.5 ${isPositive ? 'text-guardian-400' : 'text-hunter-400'}`}>
            {isPositive ? '+' : ''}${Math.abs(agent.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Trades</p>
          <p className="text-sm font-semibold text-gray-200 mt-0.5">{agent.totalTrades}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Win Rate</p>
          <p className="text-sm font-semibold text-gray-200 mt-0.5">{agent.winRate}%</p>
        </div>
      </div>

      {/* Intelligence Story Dropdown */}
      <IntelligenceStory
        story={story}
        personality={agent.personality}
        isOpen={storyOpen}
        onToggle={() => setStoryOpen(!storyOpen)}
      />

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={[
          'w-full py-2 mt-3 rounded-lg text-xs font-medium transition-all duration-300',
          'border',
          isRunning
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:shadow-amber-500/10 hover:shadow-md'
            : 'border-guardian-500/30 bg-guardian-500/10 text-guardian-400 hover:bg-guardian-500/20 hover:shadow-guardian-500/10 hover:shadow-md',
          isToggling ? 'opacity-60 cursor-not-allowed scale-[0.98]' : '',
        ].join(' ')}
      >
        {isRunning ? 'Pause Agent' : 'Start Agent'}
      </button>
    </div>
  );
}

export { AgentCard, PersonalityIcon };
export type { AgentCardProps, AgentCardAgent, IntelligenceStory };
