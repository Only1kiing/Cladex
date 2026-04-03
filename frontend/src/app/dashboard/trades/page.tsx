'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import type { AgentPersonality } from '@/types';

interface Trade {
  id: string;
  symbol: string;
  side: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  pnlPercent: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status?: string;
  agent: { id: string; name: string; personality: string } | null;
  createdAt: string;
}

export default function TradesPage() {
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [totalPnl, setTotalPnl] = useState(0);
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      // Fetch live P&L for open trades
      const pnlData = await api.get<{ trades: Trade[]; totalPnl: number }>('/trades/pnl');
      if (pnlData) {
        setOpenTrades(pnlData.trades);
        setTotalPnl(pnlData.totalPnl);
      }

      // Fetch all trades for history
      const allData = await api.get<{ trades: Array<{
        id: string; symbol: string; side: string; amount: number;
        price: number; profit: number; status: string; createdAt: string;
        stopLoss: number | null; takeProfit: number | null;
        agent: { id: string; name: string; personality: string } | null;
      }> }>('/trades/recent');
      if (allData?.trades) {
        setClosedTrades(allData.trades.filter(t => t.status === 'CLOSED').map(t => ({
          ...t,
          entryPrice: t.price,
          currentPrice: t.price,
          pnlPercent: 0,
        })));
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 10000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const trades = tab === 'open' ? openTrades : closedTrades;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Trades</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {openTrades.length} open &middot; {closedTrades.length} closed
          </p>
        </div>
        {totalPnl !== 0 && (
          <div className="text-right">
            <p className={`text-lg font-bold tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-500">Unrealized P&L</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        <button
          onClick={() => setTab('open')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'open' ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Open ({openTrades.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'history' ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          History ({closedTrades.length})
        </button>
      </div>

      {/* Trades list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#B8FF3C]/30 border-t-[#B8FF3C] rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 mt-3">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-white/[0.08] bg-[#111118]">
          <p className="text-sm text-gray-400">
            {tab === 'open' ? 'No open trades' : 'No trade history yet'}
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            {tab === 'open' ? 'Execute a signal to open a trade' : 'Closed trades will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map((trade) => {
            const isBuy = trade.side === 'BUY' || trade.side === 'buy';
            const pColor = trade.agent?.personality?.toLowerCase() === 'apex' ? 'text-red-400'
              : trade.agent?.personality?.toLowerCase() === 'echo' ? 'text-violet-400'
              : trade.agent?.personality?.toLowerCase() === 'nova' ? 'text-emerald-400'
              : 'text-cyan-400';
            const time = new Date(trade.createdAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={trade.id} className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {trade.agent && (
                      <AgentAvatar
                        personality={(trade.agent.personality?.toLowerCase() || 'sage') as AgentPersonality}
                        size={28}
                        active={tab === 'open'}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        {trade.agent && <span className={`text-sm font-semibold ${pColor}`}>{trade.agent.name}</span>}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {trade.side}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">{time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold tabular-nums ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                    </p>
                    {tab === 'open' && trade.pnlPercent !== 0 && (
                      <p className={`text-[10px] tabular-nums ${trade.pnlPercent >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{trade.symbol}</span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>Entry: <span className="text-gray-300 tabular-nums">${trade.entryPrice.toLocaleString()}</span></span>
                    {tab === 'open' && trade.currentPrice > 0 && (
                      <span>Now: <span className="text-gray-300 tabular-nums">${trade.currentPrice.toLocaleString()}</span></span>
                    )}
                  </div>
                </div>

                {/* SL/TP bar */}
                {(trade.stopLoss || trade.takeProfit) && (
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    {trade.stopLoss && (
                      <span className="text-red-400/60">SL: ${trade.stopLoss.toLocaleString()}</span>
                    )}
                    {trade.takeProfit && (
                      <span className="text-emerald-400/60">TP: ${trade.takeProfit.toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
