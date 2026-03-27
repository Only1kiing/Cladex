'use client';

import React, { useEffect, useCallback, useState } from 'react';

type TriggerType = 'agent_limit' | 'locked_feature' | 'premium_agent' | 'gift_limit';
type PlanType = 'free' | 'pro' | 'premium';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: TriggerType;
  currentPlan?: PlanType;
}

const PLAN_LIMITS: Record<PlanType, { agents: number; gifts: number }> = {
  free: { agents: 2, gifts: 3 },
  pro: { agents: 5, gifts: 20 },
  premium: { agents: 999, gifts: 999 },
};

const FEATURES = [
  { name: 'AI Trading Agents', free: '2', pro: '5', premium: 'Unlimited' },
  { name: 'Daily Gifts', free: '3', pro: '20', premium: 'Unlimited' },
  { name: 'Advanced Analytics', free: false, pro: true, premium: true },
  { name: 'Auto-Copy Trading', free: false, pro: true, premium: true },
  { name: 'Premium Agents', free: false, pro: false, premium: true },
  { name: 'Priority Execution', free: false, pro: false, premium: true },
  { name: 'Performance Fee', free: '15%', pro: '10%', premium: '5%' },
];

const triggerContent: Record<
  TriggerType,
  { title: string; description: string; icon: React.ReactNode }
> = {
  agent_limit: {
    title: "You've reached your agent limit",
    description:
      'Upgrade your plan to deploy more AI trading agents and maximize your portfolio returns.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="8" width="40" height="32" rx="4" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <circle cx="18" cy="22" r="5" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <circle cx="30" cy="22" r="5" stroke="#6366f1" strokeWidth="2" fill="none" />
        <path d="M10 36c2-4 5-6 8-6s6 2 8 6" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M22 36c2-4 5-6 8-6s6 2 8 6" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="38" cy="12" r="6" fill="#ef4444" />
        <path d="M38 9v6M35 12h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  locked_feature: {
    title: 'This is a Pro feature',
    description:
      'Unlock advanced analytics, auto-copy trading, and more powerful tools with a Pro subscription.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="20" width="32" height="22" rx="4" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <path d="M16 20v-6a8 8 0 1116 0v6" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="32" r="3" fill="#3b82f6" />
        <path d="M24 35v4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  premium_agent: {
    title: 'This agent requires Premium',
    description:
      'Premium agents use advanced strategies with higher win rates and lower performance fees.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <polygon points="24,4 30,18 46,20 34,30 37,44 24,37 11,44 14,30 2,20 18,18" stroke="#a855f7" strokeWidth="2" fill="none" />
        <polygon points="24,12 28,22 38,23 30,29 32,38 24,33 16,38 18,29 10,23 20,22" fill="#a855f7" fillOpacity="0.2" />
      </svg>
    ),
  },
  gift_limit: {
    title: 'Daily gift limit reached',
    description:
      'Upgrade for more daily gifts to share with friends and grow your referral network.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="20" width="36" height="22" rx="3" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <rect x="4" y="16" width="40" height="8" rx="2" stroke="#6366f1" strokeWidth="2" fill="none" />
        <path d="M24 16v26" stroke="#6366f1" strokeWidth="2" />
        <path d="M24 16c-2-8-10-10-12-6s4 6 12 6" stroke="#3b82f6" strokeWidth="2" fill="none" />
        <path d="M24 16c2-8 10-10 12-6s-4 6-12 6" stroke="#a855f7" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l4 4 6-7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CrossIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function UpgradeModal({
  isOpen,
  onClose,
  trigger,
  currentPlan = 'free',
}: UpgradeModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

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

  const content = triggerContent[trigger];
  const limits = PLAN_LIMITS[currentPlan];

  const planBadgeColor: Record<PlanType, string> = {
    free: 'bg-gray-700 text-gray-300',
    pro: 'bg-blue-900/50 text-blue-400 border border-blue-800',
    premium: 'bg-purple-900/50 text-purple-400 border border-purple-800',
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        animating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg bg-[#0a0a0f] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          animating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

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
          {/* Icon */}
          <div className="flex justify-center mb-5">{content.icon}</div>

          {/* Title & description */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            {content.title}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-4 leading-relaxed">
            {content.description}
          </p>

          {/* Current plan badge */}
          <div className="flex justify-center mb-6">
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${planBadgeColor[currentPlan]}`}
            >
              Current: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              {trigger === 'agent_limit' && ` (${limits.agents} agents)`}
              {trigger === 'gift_limit' && ` (${limits.gifts}/day)`}
            </span>
          </div>

          {/* Feature comparison table */}
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-4 gap-0 text-xs">
              {/* Header */}
              <div className="px-3 py-2.5 text-gray-500 font-medium border-b border-[#1e1e2e]">
                Feature
              </div>
              <div className="px-3 py-2.5 text-gray-400 font-medium text-center border-b border-[#1e1e2e]">
                Free
              </div>
              <div className="px-3 py-2.5 text-blue-400 font-medium text-center border-b border-[#1e1e2e]">
                Pro
              </div>
              <div className="px-3 py-2.5 text-purple-400 font-medium text-center border-b border-[#1e1e2e]">
                Premium
              </div>

              {/* Rows */}
              {FEATURES.map((f, i) => (
                <React.Fragment key={f.name}>
                  <div
                    className={`px-3 py-2 text-gray-400 ${
                      i < FEATURES.length - 1 ? 'border-b border-[#1e1e2e]/50' : ''
                    }`}
                  >
                    {f.name}
                  </div>
                  {(['free', 'pro', 'premium'] as const).map((plan) => {
                    const val = f[plan];
                    return (
                      <div
                        key={plan}
                        className={`px-3 py-2 text-center flex items-center justify-center ${
                          i < FEATURES.length - 1 ? 'border-b border-[#1e1e2e]/50' : ''
                        }`}
                      >
                        {typeof val === 'boolean' ? (
                          val ? (
                            <CheckIcon />
                          ) : (
                            <CrossIcon />
                          )
                        ) : (
                          <span
                            className={
                              plan === 'premium'
                                ? 'text-purple-400'
                                : plan === 'pro'
                                ? 'text-blue-400'
                                : 'text-gray-500'
                            }
                          >
                            {val}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <button className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]">
            Upgrade to Pro &mdash; $29/mo
          </button>

          <div className="flex flex-col items-center gap-2 mt-4">
            <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Or go Premium &mdash; $99/mo
            </button>
            <button
              onClick={onClose}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(16px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
