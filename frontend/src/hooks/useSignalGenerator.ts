'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getDeployedAgents } from '@/lib/agents-store';
import type { DeployedAgent } from '@/lib/agents-store';
import type { AgentPersonality } from '@/types';

export interface TradeSignal {
  id: string;
  agentName: string;
  agentId?: string;
  personality: AgentPersonality;
  color: string;
  pair: string;
  side: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reason: string;
  timestamp: number;
  expiresAt: number;
  status: 'active' | 'executed' | 'expired' | 'missed';
  estimatedPnl: number;
  isOwnAgent: boolean;
}

// Community agents shown when user has no deployed agents
const COMMUNITY_AGENTS = [
  { name: 'Raze', personality: 'apex' as AgentPersonality, color: 'text-red-400' },
  { name: 'Iris', personality: 'echo' as AgentPersonality, color: 'text-violet-400' },
  { name: 'Knox', personality: 'nova' as AgentPersonality, color: 'text-emerald-400' },
  { name: 'Byte', personality: 'sage' as AgentPersonality, color: 'text-cyan-400' },
];

const PERSONALITY_COLORS: Record<AgentPersonality, string> = {
  apex: 'text-red-400',
  echo: 'text-violet-400',
  nova: 'text-emerald-400',
  sage: 'text-cyan-400',
};

// Personality-specific signal reasoning
const PERSONALITY_REASONS: Record<AgentPersonality, string[]> = {
  apex: ['Momentum breakout detected', 'Liquidation cascade incoming', 'Volume spike — fast entry', 'Breakout above resistance', 'Scalp opportunity — tight window'],
  echo: ['Predictive model convergence', 'Pattern last seen before +12% move', 'Cycle analysis confirms entry', 'My models say now is the time', 'Reversal probability at 84%'],
  nova: ['Safe entry at strong support', 'Risk-adjusted opportunity', 'Conservative setup with high R:R', 'Capital-protected entry zone', 'Low drawdown setup identified'],
  sage: ['RSI divergence + volume breakout', 'On-chain metrics confirm', 'Cross-exchange arb detected', 'Technical indicators aligned', 'Smart money flow positive'],
};

const SIGNAL_TEMPLATES = [
  { pair: 'BTC/USDT', base: 67200, spread: 0.034 },
  { pair: 'ETH/USDT', base: 3420, spread: 0.04 },
  { pair: 'SOL/USDT', base: 142, spread: 0.05 },
  { pair: 'LINK/USDT', base: 14.5, spread: 0.045 },
  { pair: 'AVAX/USDT', base: 35.8, spread: 0.042 },
  { pair: 'ARB/USDT', base: 1.12, spread: 0.055 },
];

function generateSignal(agent: { name: string; id?: string; personality: AgentPersonality; color: string; assets?: string[] }, isOwn: boolean): TradeSignal {
  // Pick pair from agent's assets if available, otherwise random
  let template;
  if (agent.assets && agent.assets.length > 0) {
    const assetPair = `${agent.assets[Math.floor(Math.random() * agent.assets.length)]}/USDT`;
    template = SIGNAL_TEMPLATES.find(t => t.pair === assetPair) || SIGNAL_TEMPLATES[Math.floor(Math.random() * SIGNAL_TEMPLATES.length)];
  } else {
    template = SIGNAL_TEMPLATES[Math.floor(Math.random() * SIGNAL_TEMPLATES.length)];
  }

  const side = Math.random() > 0.35 ? 'long' : 'short';
  const variance = 1 + (Math.random() - 0.5) * 0.02;
  const entry = Math.round(template.base * variance * 100) / 100;
  const slPercent = 0.015 + Math.random() * 0.025;
  const tpPercent = 0.025 + Math.random() * 0.06;

  const stopLoss = side === 'long'
    ? Math.round(entry * (1 - slPercent) * 100) / 100
    : Math.round(entry * (1 + slPercent) * 100) / 100;
  const takeProfit = side === 'long'
    ? Math.round(entry * (1 + tpPercent) * 100) / 100
    : Math.round(entry * (1 - tpPercent) * 100) / 100;

  const reasons = PERSONALITY_REASONS[agent.personality];
  const confidence = 65 + Math.floor(Math.random() * 30);
  const estimatedPnl = Math.round((50 + Math.random() * 400) * 100) / 100;
  const now = Date.now();
  const expiryMinutes = 2 + Math.floor(Math.random() * 4);

  return {
    id: `sig-${now}-${Math.random().toString(36).slice(2, 7)}`,
    agentName: agent.name,
    agentId: agent.id,
    personality: agent.personality,
    color: agent.color,
    pair: template.pair,
    side,
    entryPrice: entry,
    stopLoss,
    takeProfit,
    confidence,
    reason: reasons[Math.floor(Math.random() * reasons.length)],
    timestamp: now,
    expiresAt: now + expiryMinutes * 60 * 1000,
    status: 'active',
    estimatedPnl,
    isOwnAgent: isOwn,
  };
}

export function useSignalGenerator() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [missedCount, setMissedCount] = useState(0);
  const [missedPnl, setMissedPnl] = useState(0);
  const [manualTradeCount, setManualTradeCount] = useState(0);
  const [executedTrades, setExecutedTrades] = useState<{ signal: TradeSignal; result: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  const getSignalAgents = useCallback(() => {
    const deployed = getDeployedAgents().filter(a => a.status === 'active');
    if (deployed.length > 0) {
      return {
        agents: deployed.map(a => ({
          name: a.name,
          id: a.id,
          personality: a.personality,
          color: PERSONALITY_COLORS[a.personality],
          assets: a.assets,
        })),
        isOwn: true,
      };
    }
    return {
      agents: COMMUNITY_AGENTS.map(a => ({ ...a, id: undefined, assets: undefined })),
      isOwn: false,
    };
  }, []);

  // Generate signals periodically
  useEffect(() => {
    const firstTimeout = setTimeout(() => {
      const { agents, isOwn } = getSignalAgents();
      if (agents.length === 0) return;
      const agent = agents[Math.floor(Math.random() * agents.length)];
      setSignals(prev => [...prev, generateSignal(agent, isOwn)]);
    }, 5000);

    intervalRef.current = setInterval(() => {
      const { agents, isOwn } = getSignalAgents();
      if (agents.length === 0) return;
      setSignals(prev => {
        const active = prev.filter(s => s.status === 'active');
        if (active.length >= 3) return prev;
        const agent = agents[Math.floor(Math.random() * agents.length)];
        return [...prev, generateSignal(agent, isOwn)];
      });
    }, 25000 + Math.random() * 20000);

    return () => {
      clearTimeout(firstTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [getSignalAgents]);

  // Listen for agent changes (deploy/status updates)
  useEffect(() => {
    const handler = () => {
      // New agents deployed — signals will use them on next generation
    };
    window.addEventListener('cladex_agents_updated', handler);
    return () => window.removeEventListener('cladex_agents_updated', handler);
  }, []);

  // Check for expired signals
  useEffect(() => {
    const check = setInterval(() => {
      const now = Date.now();
      setSignals(prev => {
        let newMissed = 0;
        let newMissedPnl = 0;
        const updated = prev.map(s => {
          if (s.status === 'active' && now >= s.expiresAt) {
            newMissed++;
            newMissedPnl += s.estimatedPnl;
            return { ...s, status: 'missed' as const };
          }
          return s;
        });
        if (newMissed > 0) {
          setMissedCount(c => c + newMissed);
          setMissedPnl(p => Math.round((p + newMissedPnl) * 100) / 100);
        }
        return updated;
      });
    }, 5000);
    return () => clearInterval(check);
  }, []);

  // Clean up executed signals after 2s, missed after 15s
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setSignals(prev => prev.filter(s => {
        if (s.status === 'executed') return false;
        if (s.status === 'missed' && now - s.expiresAt > 15000) return false;
        return true;
      }));
    }, 2000);
    return () => clearInterval(cleanup);
  }, []);

  const executeSignal = useCallback((signalId: string): Promise<number> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const pnlResult = Math.random() > 0.35
          ? Math.round((20 + Math.random() * 350) * 100) / 100
          : -Math.round((10 + Math.random() * 80) * 100) / 100;

        setSignals(prev => prev.map(s =>
          s.id === signalId ? { ...s, status: 'executed' as const } : s
        ));
        setManualTradeCount(c => c + 1);

        const signal = signals.find(s => s.id === signalId);
        if (signal) {
          setExecutedTrades(prev => [...prev, { signal, result: pnlResult }]);
        }

        resolve(pnlResult);
      }, 1000 + Math.random() * 1500);
    });
  }, [signals]);

  const dismissSignal = useCallback((signalId: string) => {
    setSignals(prev => prev.filter(s => s.id !== signalId));
  }, []);

  const hasOwnAgents = getDeployedAgents().filter(a => a.status === 'active').length > 0;

  return {
    signals,
    activeSignals: signals.filter(s => s.status === 'active'),
    missedCount,
    missedPnl,
    manualTradeCount,
    executedTrades,
    executeSignal,
    dismissSignal,
    hasOwnAgents,
  };
}
