'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AgentAvatar } from './AgentAvatar';
import { addActiveTrade } from './ActiveTrades';
import type { TradeSignal } from '@/hooks/useSignalGenerator';

interface TradeExecutionModalProps {
  isOpen: boolean;
  signal: TradeSignal | null;
  onClose: () => void;
  onExecute: (signalId: string) => Promise<number>;
  exchangeConnected: boolean;
  exchangeName?: string;
}

const MARKET_KEY = 'cladex_market_type';
const FUTURES_WARNING_KEY = 'cladex_futures_warning_seen';

function TradeExecutionModal({ isOpen, signal, onClose, onExecute, exchangeConnected, exchangeName }: TradeExecutionModalProps) {
  const [stage, setStage] = useState<'confirm' | 'futures-warning' | 'executing' | 'active'>('confirm');
  const [positionSize, setPositionSize] = useState(500);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');
  const [leverage, setLeverage] = useState(5);

  // Load saved market preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(MARKET_KEY);
    if (saved === 'futures') setMarketType('futures');
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage('confirm');
      setPositionSize(500);
      setLeverage(5);
    }
  }, [isOpen]);

  if (!signal) return null;

  const isShort = signal.side === 'short';
  const spotDisabled = isShort; // Can't short on spot

  const riskAmount = Math.round(positionSize * Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100) / 100;
  const rewardAmount = Math.round(positionSize * Math.abs(signal.takeProfit - signal.entryPrice) / signal.entryPrice * 100) / 100;
  const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : '—';

  const effectiveSize = marketType === 'futures' ? positionSize * leverage : positionSize;
  const effectiveRisk = marketType === 'futures' ? Math.round(riskAmount * leverage * 100) / 100 : riskAmount;
  const effectiveReward = marketType === 'futures' ? Math.round(rewardAmount * leverage * 100) / 100 : rewardAmount;
  const liquidationPrice = marketType === 'futures'
    ? signal.side === 'long'
      ? Math.round(signal.entryPrice * (1 - 1 / leverage) * 100) / 100
      : Math.round(signal.entryPrice * (1 + 1 / leverage) * 100) / 100
    : null;

  const handleMarketChange = (type: 'spot' | 'futures') => {
    if (type === 'futures') {
      const warningSeen = localStorage.getItem(FUTURES_WARNING_KEY);
      if (!warningSeen) {
        setStage('futures-warning');
        return;
      }
    }
    setMarketType(type);
    localStorage.setItem(MARKET_KEY, type);
  };

  const handleAcceptFuturesRisk = () => {
    localStorage.setItem(FUTURES_WARNING_KEY, 'true');
    localStorage.setItem(MARKET_KEY, 'futures');
    setMarketType('futures');
    setStage('confirm');
  };

  const handleExecute = async () => {
    setStage('executing');
    await onExecute(signal.id);

    // Add to active trades sidebar
    addActiveTrade({
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentName: signal.agentName,
      personality: signal.personality,
      pair: signal.pair,
      side: signal.side,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      positionSize: effectiveSize,
      openedAt: Date.now(),
    });

    setStage('active');
  };

  const sideLabel = marketType === 'spot'
    ? (signal.side === 'long' ? 'BUY' : 'SELL')
    : signal.side.toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Futures risk warning */}
      {stage === 'futures-warning' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-2">Futures Trading Risk</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Futures trading uses leverage, which amplifies both gains and losses. You can lose more than your initial position size.
            </p>
          </div>

          <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-4 text-left space-y-2">
            <div className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-amber-400 mt-0.5">&#x26A0;</span>
              <span>Leveraged positions can be <span className="text-amber-400 font-semibold">liquidated</span> if price moves against you</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-amber-400 mt-0.5">&#x26A0;</span>
              <span>Higher leverage = higher risk of total loss</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-amber-400 mt-0.5">&#x26A0;</span>
              <span>Only trade with funds you can afford to lose</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleAcceptFuturesRisk}
              className="w-full py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-sm font-bold text-amber-400 hover:bg-amber-500/30 transition-all"
            >
              I Understand the Risks
            </button>
            <button
              onClick={() => { setStage('confirm'); }}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Stay on Spot
            </button>
          </div>
        </div>
      )}

      {/* Confirm stage */}
      {stage === 'confirm' && (
        <div className="space-y-4">
          {/* Agent header */}
          <div className="flex items-center gap-3">
            <AgentAvatar personality={signal.personality} size={36} active />
            <div>
              <h3 className="text-base font-bold text-white">Confirm Trade</h3>
              <p className="text-xs text-gray-500">Signal by {signal.agentName}</p>
            </div>
          </div>

          {/* Market type toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => handleMarketChange('spot')}
              disabled={spotDisabled}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                marketType === 'spot'
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : spotDisabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => handleMarketChange('futures')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                marketType === 'futures'
                  ? 'bg-amber-500/15 text-amber-400 shadow-sm border border-amber-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Futures
            </button>
          </div>

          {spotDisabled && marketType === 'spot' && (
            <p className="text-[10px] text-amber-400 text-center">Short positions require Futures mode</p>
          )}

          {/* Pair + Side badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
              signal.side === 'long'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/15 text-red-400 border border-red-500/20'
            }`}>
              {sideLabel}
            </span>
            <span className="text-base font-bold text-white">{signal.pair}</span>
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
              marketType === 'futures'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-white/[0.06] text-gray-400'
            }`}>
              {marketType === 'futures' ? `Perpetual ${leverage}x` : 'Spot'}
            </span>
          </div>

          {/* Price info */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
              <p className="text-[9px] text-gray-500 uppercase mb-0.5">Entry</p>
              <p className="text-sm font-bold text-white tabular-nums">${signal.entryPrice.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-red-500/[0.04] border border-red-500/10 p-2.5 text-center">
              <p className="text-[9px] text-red-400/60 uppercase mb-0.5">Stop Loss</p>
              <p className="text-sm font-bold text-red-400 tabular-nums">${signal.stopLoss.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 p-2.5 text-center">
              <p className="text-[9px] text-emerald-400/60 uppercase mb-0.5">Take Profit</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">${signal.takeProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* Leverage selector (futures only) */}
          {marketType === 'futures' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium">Leverage</label>
                <span className="text-sm font-bold text-amber-400 tabular-nums">{leverage}x</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 3, 5, 10, 20, 50].map(l => (
                  <button
                    key={l}
                    onClick={() => setLeverage(l)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      leverage === l
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300'
                    }`}
                  >
                    {l}x
                  </button>
                ))}
              </div>
              {leverage >= 20 && (
                <p className="text-[9px] text-red-400 mt-1.5 text-center">High leverage — liquidation at ${liquidationPrice?.toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Position size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Position Size</label>
              <div className="text-right">
                <span className="text-sm font-bold text-white tabular-nums">${positionSize}</span>
                {marketType === 'futures' && (
                  <span className="text-[10px] text-amber-400/60 ml-1.5">(${effectiveSize.toLocaleString()} effective)</span>
                )}
              </div>
            </div>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={positionSize}
              onChange={e => setPositionSize(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] accent-[#B8FF3C] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>$100</span>
              <span>$5,000</span>
            </div>
          </div>

          {/* Risk/Reward */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500 uppercase">Risk</p>
              <p className="text-sm font-bold text-red-400 tabular-nums">${effectiveRisk}</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500 uppercase">Reward</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">${effectiveReward}</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500 uppercase">R:R</p>
              <p className="text-sm font-bold text-[#B8FF3C] tabular-nums">1:{rrRatio}</p>
            </div>
            {liquidationPrice && (
              <>
                <div className="h-8 w-px bg-white/[0.06]" />
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 uppercase">Liq.</p>
                  <p className="text-sm font-bold text-amber-400 tabular-nums">${liquidationPrice.toLocaleString()}</p>
                </div>
              </>
            )}
          </div>

          {/* Reason */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{signal.reason} &middot; {signal.confidence}% confidence</span>
          </div>

          {/* Execute button */}
          <button
            onClick={handleExecute}
            disabled={spotDisabled && marketType === 'spot'}
            className="w-full py-3.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#B8FF3C]/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exchangeConnected
              ? `Execute on ${exchangeName || 'Exchange'}`
              : `Execute ${sideLabel} (Demo)`}
          </button>

          {!exchangeConnected && (
            <p className="text-[10px] text-center text-gray-600">Paper trade — no real funds used</p>
          )}
        </div>
      )}

      {/* Executing stage */}
      {stage === 'executing' && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <svg className="w-12 h-12 animate-spin text-[#B8FF3C]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          <p className="text-sm font-semibold text-gray-200">
            Placing {sideLabel} {signal.pair}...
          </p>
          <p className="text-xs text-gray-500">
            {exchangeConnected ? `Sending to ${exchangeName || 'exchange'}` : 'Processing paper trade'}
          </p>
        </div>
      )}

      {/* Trade active confirmation */}
      {stage === 'active' && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <p className="text-lg font-bold text-white">Trade Active</p>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              signal.side === 'long'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {sideLabel}
            </span>
            <span className="text-sm font-semibold text-gray-200">{signal.pair}</span>
            <span className="text-xs text-gray-500">at ${signal.entryPrice.toLocaleString()}</span>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 w-full">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Size</p>
                <p className="text-xs font-bold text-white tabular-nums">${effectiveSize.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Type</p>
                <p className="text-xs font-bold text-gray-300">{marketType === 'futures' ? `Futures ${leverage}x` : 'Spot'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Agent</p>
                <p className="text-xs font-bold text-gray-300">{signal.agentName}</p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            Track this trade in the <span className="text-[#B8FF3C] font-medium">Active Trades</span> sidebar
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-200 hover:bg-white/[0.1] transition-all mt-1"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

export { TradeExecutionModal };
