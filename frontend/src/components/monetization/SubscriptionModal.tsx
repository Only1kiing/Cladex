'use client';

import React, { useEffect, useCallback, useState, useMemo } from 'react';

type Personality = 'guardian' | 'analyst' | 'hunter' | 'oracle';

interface AgentInfo {
  name: string;
  personality: Personality;
  creator: string;
  monthlyReturn: number;
  winRate: number;
  trades: number;
  description: string;
  price: number;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentInfo;
}

const personalityConfig: Record<
  Personality,
  { label: string; bg: string; border: string; text: string; hex: string; gradient: string }
> = {
  guardian: {
    label: 'Guardian',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    hex: '#22c55e',
    gradient: 'from-green-600 to-green-500',
  },
  analyst: {
    label: 'Analyst',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hex: '#3b82f6',
    gradient: 'from-blue-600 to-blue-500',
  },
  hunter: {
    label: 'Hunter',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    hex: '#ef4444',
    gradient: 'from-red-600 to-red-500',
  },
  oracle: {
    label: 'Oracle',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    hex: '#a855f7',
    gradient: 'from-purple-600 to-purple-500',
  },
};

const FEATURES = [
  {
    title: 'Real-time signals',
    desc: 'Get instant trade alerts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M1 13l4-4 3 3 5-6 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Auto-copy trades',
    desc: 'Mirror trades automatically',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 5V3a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    title: 'Strategy updates',
    desc: 'Evolving AI strategies',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1v3M9 14v3M1 9h3M14 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
];

function MiniSparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    let v = 30;
    for (let i = 0; i < 20; i++) {
      v += (Math.random() - 0.35) * 8;
      v = Math.max(5, Math.min(55, v));
      pts.push(v);
    }
    return pts;
  }, []);

  const pathD = points
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 5},${60 - y}`)
    .join(' ');

  return (
    <svg width="95" height="36" viewBox="0 0 95 60" fill="none" className="opacity-80">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L95,60 L0,60 Z`} fill={`url(#spark-${color})`} />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  agent,
}: SubscriptionModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const config = personalityConfig[agent.personality];
  const annualPrice = Math.round(agent.price * 12 * 0.8);
  const annualMonthly = (annualPrice / 12).toFixed(2);
  const displayPrice = billing === 'monthly' ? agent.price : Number(annualMonthly);
  const totalPrice = billing === 'monthly' ? agent.price : annualPrice;
  const savings = billing === 'annual' ? Math.round(agent.price * 12 - annualPrice) : 0;

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
          style={{ backgroundColor: config.hex }}
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
          {/* Agent card preview */}
          <div className={`bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 mb-6`}>
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div
                className={`w-12 h-12 rounded-xl ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}
              >
                <span className={`text-lg font-bold ${config.text}`}>
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {agent.name}
                  </h3>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.text} border ${config.border}`}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">by {agent.creator}</p>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-400 font-medium">
                    +{agent.monthlyReturn}%
                    <span className="text-gray-600 font-normal"> /mo</span>
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-300">
                    {agent.winRate}%
                    <span className="text-gray-600"> win</span>
                  </span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-500">{agent.trades} trades</span>
                </div>
              </div>

              {/* Mini sparkline */}
              <div className="flex-shrink-0">
                <MiniSparkline color={config.hex} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-white text-center mb-1">
            Subscribe to {agent.name}
          </h2>
          <p className="text-gray-500 text-xs text-center mb-5 leading-relaxed max-w-xs mx-auto">
            {agent.description}
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className={`${config.text} flex-shrink-0`}>{f.icon}</div>
                <div>
                  <p className="text-sm text-white font-medium">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Billing cycle selector */}
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-1 flex mb-5">
            <button
              onClick={() => setBilling('monthly')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                billing === 'monthly'
                  ? 'bg-[#1e1e2e] text-white shadow'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 relative ${
                billing === 'annual'
                  ? 'bg-[#1e1e2e] text-white shadow'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              Annual
              <span className="ml-1 text-green-400 text-[10px] font-semibold">
                -20%
              </span>
            </button>
          </div>

          {/* Payment summary */}
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{agent.name} subscription</span>
              <span className="text-white font-medium">
                ${displayPrice.toFixed(2)}/mo
              </span>
            </div>
            {billing === 'annual' && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Billed annually</span>
                  <span className="text-gray-400">${totalPrice}/yr</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-400">Annual savings</span>
                  <span className="text-green-400">-${savings}</span>
                </div>
              </>
            )}
            <div className="border-t border-[#1e1e2e] pt-2 flex justify-between">
              <span className="text-sm font-medium text-white">Total</span>
              <span className="text-sm font-bold text-white">
                {billing === 'monthly'
                  ? `$${agent.price.toFixed(2)}`
                  : `$${totalPrice}/yr`}
              </span>
            </div>
          </div>

          {/* Subscribe button */}
          <button
            className={`w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r ${config.gradient} hover:brightness-110 transition-all duration-200 shadow-lg active:scale-[0.98]`}
            style={{ boxShadow: `0 8px 24px ${config.hex}33` }}
          >
            Subscribe Now
          </button>

          {/* Guarantees */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L2 3.5v3.5C2 10.5 4.1 13 7 13.5 9.9 13 12 10.5 12 7V3.5L7 1z"
                  stroke="#4b5563"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d="M5 7l1.5 1.5L9 5.5"
                  stroke="#4b5563"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              30-day money-back guarantee
            </div>
            <span className="text-gray-700">|</span>
            <span className="text-xs text-gray-500">Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
