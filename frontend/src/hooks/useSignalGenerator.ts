'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentPersonality } from '@/types';

export interface TradeSignal {
  id: string;
  agentName: string;
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
}

const SIGNAL_AGENTS = [
  { name: 'Raze', personality: 'hunter' as AgentPersonality, color: 'text-red-400' },
  { name: 'Iris', personality: 'oracle' as AgentPersonality, color: 'text-violet-400' },
  { name: 'Knox', personality: 'guardian' as AgentPersonality, color: 'text-emerald-400' },
  { name: 'Byte', personality: 'analyst' as AgentPersonality, color: 'text-cyan-400' },
  { name: 'Nova', personality: 'hunter' as AgentPersonality, color: 'text-red-400' },
  { name: 'Luna', personality: 'oracle' as AgentPersonality, color: 'text-violet-400' },
  { name: 'Cipher', personality: 'analyst' as AgentPersonality, color: 'text-cyan-400' },
];

const SIGNAL_TEMPLATES = [
  { pair: 'BTC/USDT', base: 67200, spread: 0.034, reasons: ['RSI divergence + volume breakout', 'Double bottom at support', 'Golden cross on 4H', 'Whale accumulation detected'] },
  { pair: 'ETH/USDT', base: 3420, spread: 0.04, reasons: ['Bull flag confirmed', 'Breakout above resistance', 'DEX volume spike', 'ETH/BTC ratio reversal'] },
  { pair: 'SOL/USDT', base: 142, spread: 0.05, reasons: ['Momentum breakout', 'TVL surge on Solana', 'NFT volume spike', 'Breakout above $140 resistance'] },
  { pair: 'LINK/USDT', base: 14.5, spread: 0.045, reasons: ['Oracle demand increasing', 'CCIP adoption signal', 'Accumulation pattern', 'Smart money inflow'] },
  { pair: 'AVAX/USDT', base: 35.8, spread: 0.042, reasons: ['Subnet activity up 200%', 'Bull pennant forming', 'Institutional buying', 'Cross-chain volume spike'] },
  { pair: 'ARB/USDT', base: 1.12, spread: 0.055, reasons: ['L2 dominance growing', 'Airdrop farming ended, real usage remains', 'Technical breakout', 'Sequencer revenue ATH'] },
];

function generateSignal(): TradeSignal {
  const agent = SIGNAL_AGENTS[Math.floor(Math.random() * SIGNAL_AGENTS.length)];
  const template = SIGNAL_TEMPLATES[Math.floor(Math.random() * SIGNAL_TEMPLATES.length)];
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

  const confidence = 65 + Math.floor(Math.random() * 30);
  const estimatedPnl = Math.round((50 + Math.random() * 400) * 100) / 100;
  const now = Date.now();
  const expiryMinutes = 2 + Math.floor(Math.random() * 4);

  return {
    id: `sig-${now}-${Math.random().toString(36).slice(2, 7)}`,
    agentName: agent.name,
    personality: agent.personality,
    color: agent.color,
    pair: template.pair,
    side,
    entryPrice: entry,
    stopLoss,
    takeProfit,
    confidence,
    reason: template.reasons[Math.floor(Math.random() * template.reasons.length)],
    timestamp: now,
    expiresAt: now + expiryMinutes * 60 * 1000,
    status: 'active',
    estimatedPnl,
  };
}

export function useSignalGenerator() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [missedCount, setMissedCount] = useState(0);
  const [missedPnl, setMissedPnl] = useState(0);
  const [manualTradeCount, setManualTradeCount] = useState(0);
  const [executedTrades, setExecutedTrades] = useState<{ signal: TradeSignal; result: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Generate signals periodically
  useEffect(() => {
    // Generate first signal quickly
    const firstTimeout = setTimeout(() => {
      setSignals(prev => [...prev, generateSignal()]);
    }, 5000);

    intervalRef.current = setInterval(() => {
      setSignals(prev => {
        // Max 3 active signals at a time
        const active = prev.filter(s => s.status === 'active');
        if (active.length >= 3) return prev;
        return [...prev, generateSignal()];
      });
    }, 25000 + Math.random() * 20000);

    return () => {
      clearTimeout(firstTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
        if (s.status === 'executed') return false; // remove immediately on next tick
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

  const activeSignals = signals.filter(s => s.status === 'active');

  return {
    signals,
    activeSignals,
    missedCount,
    missedPnl,
    manualTradeCount,
    executedTrades,
    executeSignal,
    dismissSignal,
  };
}
