'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AgentPersonality } from '@/types';

export interface ActiveTrade {
  id: string;
  agentName: string;
  personality: AgentPersonality;
  pair: string;
  side: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  openedAt: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

const STORAGE_KEY = 'cladex_active_trades';

function loadTrades(): ActiveTrade[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTrades(trades: ActiveTrade[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

// Global event for cross-component communication
export function addActiveTrade(trade: Omit<ActiveTrade, 'currentPrice' | 'pnl' | 'pnlPercent'>) {
  const trades = loadTrades();
  const newTrade: ActiveTrade = {
    ...trade,
    currentPrice: trade.entryPrice,
    pnl: 0,
    pnlPercent: 0,
  };
  trades.unshift(newTrade);
  saveTrades(trades);
  window.dispatchEvent(new CustomEvent('cladex_trades_updated'));
}

export function removeActiveTrade(id: string) {
  const trades = loadTrades().filter(t => t.id !== id);
  saveTrades(trades);
  window.dispatchEvent(new CustomEvent('cladex_trades_updated'));
}

const personalityColor: Record<string, string> = {
  guardian: 'text-emerald-400',
  analyst: 'text-cyan-400',
  hunter: 'text-red-400',
  oracle: 'text-violet-400',
};

function ActiveTradesWidget() {
  const [trades, setTrades] = useState<ActiveTrade[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setTrades(loadTrades());
  }, []);

  // Load on mount + listen for updates
  useEffect(() => {
    refresh();
    window.addEventListener('cladex_trades_updated', refresh);
    return () => window.removeEventListener('cladex_trades_updated', refresh);
  }, [refresh]);

  // Simulate price movement
  useEffect(() => {
    if (trades.length === 0) return;
    const interval = setInterval(() => {
      setTrades(prev => {
        const updated = prev.map(t => {
          const volatility = t.entryPrice * 0.001;
          const drift = t.side === 'long' ? 0.0001 : -0.0001;
          const change = (Math.random() - 0.48) * volatility + t.entryPrice * drift;
          const newPrice = Math.round((t.currentPrice + change) * 100) / 100;
          const pnl = t.side === 'long'
            ? Math.round((newPrice - t.entryPrice) * (t.positionSize / t.entryPrice) * 100) / 100
            : Math.round((t.entryPrice - newPrice) * (t.positionSize / t.entryPrice) * 100) / 100;
          const pnlPercent = Math.round((pnl / t.positionSize) * 10000) / 100;

          // Auto-close if SL or TP hit
          if ((t.side === 'long' && newPrice <= t.stopLoss) ||
              (t.side === 'short' && newPrice >= t.stopLoss) ||
              (t.side === 'long' && newPrice >= t.takeProfit) ||
              (t.side === 'short' && newPrice <= t.takeProfit)) {
            return null; // will be filtered out
          }

          return { ...t, currentPrice: newPrice, pnl, pnlPercent };
        }).filter(Boolean) as ActiveTrade[];
        saveTrades(updated);
        return updated;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [trades.length]);

  const handleClose = (id: string) => {
    removeActiveTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  if (trades.length === 0) return null;

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="px-3 mb-3">
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#B8FF3C] animate-pulse" />
            <span className="text-xs font-semibold text-gray-300">Active Trades</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400 font-medium">
              {trades.length}
            </span>
          </div>
          <span className={`text-[11px] font-bold tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </span>
        </div>

        {/* Trades list */}
        <div className="max-h-[240px] overflow-y-auto scrollbar-thin">
          {trades.map(trade => {
            const isExpanded = expanded === trade.id;
            const slDistance = Math.abs(trade.currentPrice - trade.stopLoss);
            const tpDistance = Math.abs(trade.takeProfit - trade.currentPrice);
            const totalRange = Math.abs(trade.takeProfit - trade.stopLoss);
            const progressToTP = totalRange > 0 ? Math.min(100, Math.max(0,
              trade.side === 'long'
                ? ((trade.currentPrice - trade.stopLoss) / totalRange) * 100
                : ((trade.stopLoss - trade.currentPrice) / totalRange) * 100
            )) : 50;

            return (
              <div key={trade.id} className="border-b border-white/[0.03] last:border-0">
                {/* Trade row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : trade.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase px-1 py-0.5 rounded ${
                        trade.side === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {trade.side === 'long' ? 'L' : 'S'}
                      </span>
                      <span className="text-xs font-semibold text-gray-200 truncate">{trade.pair}</span>
                    </div>
                    <span className={`text-[10px] font-medium ${personalityColor[trade.personality]}`}>
                      {trade.agentName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </p>
                    <p className={`text-[9px] tabular-nums ${trade.pnlPercent >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                      {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                  <svg className={`w-3 h-3 text-gray-600 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded details */}
                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[200px]' : 'max-h-0'}`}>
                  <div className="px-3 pb-2.5 space-y-2">
                    {/* Progress bar SL -> Current -> TP */}
                    <div>
                      <div className="flex justify-between text-[8px] text-gray-600 mb-0.5">
                        <span>SL ${trade.stopLoss.toLocaleString()}</span>
                        <span>TP ${trade.takeProfit.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 transition-all duration-1000"
                          style={{ width: `${progressToTP}%` }}
                        />
                      </div>
                    </div>

                    {/* Price info */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded bg-white/[0.03] py-1">
                        <p className="text-[8px] text-gray-600">ENTRY</p>
                        <p className="text-[10px] font-bold text-gray-300 tabular-nums">${trade.entryPrice.toLocaleString()}</p>
                      </div>
                      <div className="rounded bg-white/[0.03] py-1">
                        <p className="text-[8px] text-gray-600">CURRENT</p>
                        <p className={`text-[10px] font-bold tabular-nums ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${trade.currentPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded bg-white/[0.03] py-1">
                        <p className="text-[8px] text-gray-600">SIZE</p>
                        <p className="text-[10px] font-bold text-gray-300 tabular-nums">${trade.positionSize}</p>
                      </div>
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => handleClose(trade.id)}
                      className="w-full py-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-[10px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Close Trade
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ActiveTradesWidget };
