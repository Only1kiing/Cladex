'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';

type Personality = 'guardian' | 'analyst' | 'hunter' | 'oracle';

interface PerformanceFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profit: number;
  feePercent: number;
  agentName: string;
  agentPersonality: Personality;
  period: string;
}

const personalityColors: Record<Personality, { bg: string; border: string; text: string; gradient: string }> = {
  guardian: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    gradient: 'from-green-600 to-green-500',
  },
  analyst: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-500',
  },
  hunter: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    gradient: 'from-red-600 to-red-500',
  },
  oracle: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-500',
  },
};

const personalityHex: Record<Personality, string> = {
  guardian: '#22c55e',
  analyst: '#3b82f6',
  hunter: '#ef4444',
  oracle: '#a855f7',
};

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, active]);

  return value;
}

function formatUSD(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PerformanceFeeModal({
  isOpen,
  onClose,
  profit,
  feePercent,
  agentName,
  agentPersonality,
  period,
}: PerformanceFeeModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const feeAmount = profit * (feePercent / 100);
  const userKeeps = profit - feeAmount;
  const userPercent = 100 - feePercent;

  const animatedProfit = useCountUp(profit, 1200, animating);
  const animatedFee = useCountUp(feeAmount, 1200, animating);
  const animatedKeep = useCountUp(userKeeps, 1200, animating);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
      document.body.style.overflow = 'hidden';
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!visible) return null;

  const colors = personalityColors[agentPersonality];
  const hex = personalityHex[agentPersonality];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        animating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div
        className={`relative w-full max-w-md bg-[#0a0a0f] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          animating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl rounded-full pointer-events-none opacity-20"
          style={{ backgroundColor: hex }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="p-8">
          {/* Agent avatar */}
          <div className="flex justify-center mb-5">
            <div
              className={`w-16 h-16 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
            >
              <span className={`text-2xl font-bold ${colors.text}`}>
                {agentName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-1">
            Performance Fee Due
          </h2>
          <p className="text-gray-500 text-sm text-center mb-6">{period}</p>

          {/* Profit breakdown */}
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 mb-5 space-y-3">
            {/* Total Profit */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Total Profit</span>
              <span className="text-sm font-semibold text-green-400">
                +${formatUSD(animatedProfit)}
              </span>
            </div>

            {/* Fee Rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Fee Rate</span>
              <span className="text-sm text-gray-300">{feePercent}%</span>
            </div>

            {/* Divider */}
            <div className="border-t border-[#1e1e2e]" />

            {/* Fee Amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Fee Amount</span>
              <span className="text-sm text-gray-300">
                ${formatUSD(animatedFee)}
              </span>
            </div>

            {/* You Keep */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-white">You Keep</span>
              <span className="text-lg font-bold text-green-400">
                ${formatUSD(animatedKeep)}
              </span>
            </div>
          </div>

          {/* Visual profit bar */}
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
              <span>Profit Split</span>
            </div>
            <div className="w-full h-3 bg-[#111118] border border-[#1e1e2e] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out rounded-l-full"
                style={{ width: animating ? `${userPercent}%` : '0%' }}
              />
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000 ease-out rounded-r-full"
                style={{ width: animating ? `${feePercent}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs">
              <span className="text-green-400">You: {userPercent}%</span>
              <span className="text-blue-400">Fee: {feePercent}%</span>
            </div>
          </div>

          {/* Pay button */}
          <button
            className={`w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r ${colors.gradient} hover:brightness-110 transition-all duration-200 shadow-lg active:scale-[0.98]`}
            style={{ boxShadow: `0 8px 24px ${hex}33` }}
          >
            Pay ${formatUSD(feeAmount)} to Continue
          </button>

          {/* Trust text */}
          <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L2 3.5v3.5C2 10.5 4.1 13 7 13.5 9.9 13 12 10.5 12 7V3.5L7 1z"
                stroke="#4b5563"
                strokeWidth="1.2"
                fill="none"
              />
              <path d="M5 7l1.5 1.5L9 5.5" stroke="#4b5563" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Fee is only charged on profits. No profit = no fee.
          </p>

          {/* Upsell */}
          {feePercent > 5 && (
            <p className="text-center text-xs mt-3">
              <button className="text-purple-400 hover:text-purple-300 transition-colors">
                Downgrade fee? Go Premium for 5%
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
