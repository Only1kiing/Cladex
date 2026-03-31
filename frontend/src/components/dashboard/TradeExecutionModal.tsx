'use client';

import React, { useState, useEffect, useRef } from 'react';
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

function useCountUp(target: number, duration = 800, active = false) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased * 100) / 100);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, active]);

  return value;
}

function TradeExecutionModal({ isOpen, signal, onClose, onExecute, exchangeConnected, exchangeName }: TradeExecutionModalProps) {
  const [stage, setStage] = useState<'confirm' | 'executing' | 'result'>('confirm');
  const [positionSize, setPositionSize] = useState(500);
  const [pnlResult, setPnlResult] = useState(0);
  const [showPnl, setShowPnl] = useState(false);
  const displayPnl = useCountUp(pnlResult, 1000, showPnl);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage('confirm');
      setPositionSize(500);
      setPnlResult(0);
      setShowPnl(false);
    }
  }, [isOpen]);

  if (!signal) return null;

  const riskAmount = Math.round(positionSize * Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice * 100) / 100;
  const rewardAmount = Math.round(positionSize * Math.abs(signal.takeProfit - signal.entryPrice) / signal.entryPrice * 100) / 100;
  const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : '—';

  const handleExecute = async () => {
    setStage('executing');
    const result = await onExecute(signal.id);
    setPnlResult(result);
    setStage('result');
    setTimeout(() => setShowPnl(true), 400);

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
      positionSize,
      openedAt: Date.now(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Confirm stage */}
      {stage === 'confirm' && (
        <div className="space-y-5">
          {/* Agent header */}
          <div className="flex items-center gap-3">
            <AgentAvatar personality={signal.personality} size={40} active />
            <div>
              <h3 className="text-base font-bold text-white">Confirm Trade</h3>
              <p className="text-xs text-gray-500">Signal by {signal.agentName}</p>
            </div>
            <div className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
              signal.side === 'long'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {signal.side} {signal.pair}
            </div>
          </div>

          {/* Price info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Entry</p>
              <p className="text-lg font-bold text-white tabular-nums">${signal.entryPrice.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-red-500/[0.04] border border-red-500/10 p-3 text-center">
              <p className="text-[10px] text-red-400/60 uppercase mb-1">Stop Loss</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">${signal.stopLoss.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 p-3 text-center">
              <p className="text-[10px] text-emerald-400/60 uppercase mb-1">Take Profit</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">${signal.takeProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* Position size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400 font-medium">Position Size</label>
              <span className="text-sm font-bold text-white tabular-nums">${positionSize}</span>
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
              <p className="text-sm font-bold text-red-400 tabular-nums">${riskAmount}</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500 uppercase">Reward</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">${rewardAmount}</p>
            </div>
            <div className="h-8 w-px bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500 uppercase">R:R</p>
              <p className="text-sm font-bold text-[#B8FF3C] tabular-nums">1:{rrRatio}</p>
            </div>
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
            className="w-full py-3.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#B8FF3C]/20 active:scale-[0.98]"
          >
            {exchangeConnected
              ? `Execute on ${exchangeName || 'Exchange'}`
              : 'Execute Trade (Demo)'}
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
          <p className="text-sm font-semibold text-gray-200">Executing {signal.side} {signal.pair}...</p>
          <p className="text-xs text-gray-500">
            {exchangeConnected ? `Sending order to ${exchangeName || 'exchange'}` : 'Processing paper trade'}
          </p>
        </div>
      )}

      {/* Result stage */}
      {stage === 'result' && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          {/* Success icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            pnlResult >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'
          }`}>
            {pnlResult >= 0 ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.25 12.75l4.5-4.5 3 3 6-7.5" />
                <path d="M12.75 3.75h3v3" />
              </svg>
            )}
          </div>

          <p className="text-lg font-bold text-white">Trade Executed!</p>
          <p className="text-xs text-gray-500">{signal.side.toUpperCase()} {signal.pair} at ${signal.entryPrice.toLocaleString()}</p>

          {/* P&L Result */}
          <div className={`text-4xl font-black tabular-nums ${pnlResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnlResult >= 0 ? '+' : ''}${showPnl ? displayPnl.toFixed(2) : '0.00'}
          </div>

          <p className="text-[11px] text-gray-600">
            {exchangeConnected ? 'Live trade result' : 'Simulated result (demo mode)'}
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-200 hover:bg-white/[0.1] transition-all mt-2"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

export { TradeExecutionModal };
