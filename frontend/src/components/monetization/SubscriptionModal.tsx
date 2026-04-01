'use client';

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { api } from '@/lib/api';

type Personality = 'nova' | 'sage' | 'apex' | 'echo';

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
  nova: {
    label: 'Nova',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    hex: '#22c55e',
    gradient: 'from-green-600 to-green-500',
  },
  sage: {
    label: 'Sage',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    hex: '#3b82f6',
    gradient: 'from-blue-600 to-blue-500',
  },
  apex: {
    label: 'Apex',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    hex: '#ef4444',
    gradient: 'from-red-600 to-red-500',
  },
  echo: {
    label: 'Echo',
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

const SOLANA_ADDRESS = 'Pz1eoDHDQhH8Tb5buYDPSWSRP1ydxvDyqWhdJYxEznU';

export default function SubscriptionModal({
  isOpen,
  onClose,
  agent,
}: SubscriptionModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const config = personalityConfig[agent.personality];
  const annualPrice = Math.round(agent.price * 12 * 0.8);
  const annualMonthly = (annualPrice / 12).toFixed(2);
  const displayPrice = billing === 'monthly' ? agent.price : Number(annualMonthly);
  const totalPrice = billing === 'monthly' ? agent.price : annualPrice;
  const savings = billing === 'annual' ? Math.round(agent.price * 12 - annualPrice) : 0;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setShowPayment(false);
      setSubmitted(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      setCopied(false);
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

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(SOLANA_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

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

          {/* Subscribe / Payment flow */}
          {!showPayment && !submitted && (
            <>
              <button
                onClick={() => setShowPayment(true)}
                className={`w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r ${config.gradient} hover:brightness-110 transition-all duration-200 shadow-lg active:scale-[0.98]`}
                style={{ boxShadow: `0 8px 24px ${config.hex}33` }}
              >
                Subscribe Now
              </button>

              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L2 3.5v3.5C2 10.5 4.1 13 7 13.5 9.9 13 12 10.5 12 7V3.5L7 1z" stroke="#4b5563" strokeWidth="1.2" fill="none" />
                    <path d="M5 7l1.5 1.5L9 5.5" stroke="#4b5563" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  30-day money-back guarantee
                </div>
                <span className="text-gray-700">|</span>
                <span className="text-xs text-gray-500">Cancel anytime</span>
              </div>
            </>
          )}

          {showPayment && !submitted && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Send payment to (Solana)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] text-gray-200 font-mono bg-white/[0.04] rounded-lg px-3 py-2 truncate">
                    {SOLANA_ADDRESS}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: `${config.hex}15`, borderColor: `${config.hex}30`, color: config.hex, borderWidth: 1 }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  Amount: <span className="text-white font-semibold">
                    {billing === 'monthly' ? `$${agent.price.toFixed(2)}` : `$${Math.round(agent.price * 12 * 0.8)}`}
                  </span>
                  {' '}via SOL, USDT, or USDC on Solana
                </p>
              </div>

              {/* Receipt upload */}
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">Upload Payment Receipt</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  id="sub-receipt-upload"
                />
                <label
                  htmlFor="sub-receipt-upload"
                  className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/[0.12] rounded-xl px-4 py-4 text-sm text-gray-400 hover:bg-white/[0.06] transition-all cursor-pointer"
                  style={{ ['--hover-border' as string]: `${config.hex}40` }}
                >
                  {receiptFile ? (
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span className="text-emerald-400 text-xs truncate max-w-[200px]">{receiptFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload screenshot or PDF</span>
                    </>
                  )}
                </label>
                {receiptPreview && receiptFile?.type.startsWith('image/') && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.08]">
                    <img src={receiptPreview} alt="Receipt" className="w-full max-h-32 object-contain bg-black/40" />
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  if (!receiptFile) return;
                  try {
                    await api.post('/payments/receipt', {
                      plan: agent.name + ' subscription',
                      amount: billing === 'monthly' ? agent.price : Math.round(agent.price * 12 * 0.8),
                      receiptData: receiptPreview,
                      fileName: receiptFile.name,
                    });
                  } catch {
                    // Don't block the UI if the API call fails
                  }
                  setSubmitted(true);
                }}
                disabled={!receiptFile}
                className={`w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r ${config.gradient} hover:brightness-110 transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
                style={{ boxShadow: `0 8px 24px ${config.hex}33` }}
              >
                Submit Receipt for Verification
              </button>

              <button
                onClick={() => setShowPayment(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                Back
              </button>
            </div>
          )}

          {submitted && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Receipt Submitted</h3>
                <p className="text-sm text-gray-400">
                  Your subscription to {agent.name} will be activated after verification.
                </p>
              </div>
              <p className="text-xs text-gray-500">This usually takes a few minutes.</p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-200 hover:bg-white/[0.1] transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
