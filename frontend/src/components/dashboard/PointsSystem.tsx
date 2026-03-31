'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentPersonality } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, name: 'Rookie', min: 0, max: 1000 },
  { level: 2, name: 'Trader', min: 1000, max: 3000 },
  { level: 3, name: 'Pro Trader', min: 3000, max: 7000 },
  { level: 4, name: 'Elite', min: 7000, max: 15000 },
  { level: 5, name: 'Whale', min: 15000, max: Infinity },
] as const;

function getLevelInfo(points: number) {
  const lvl = LEVELS.find((l) => points >= l.min && points < l.max) ?? LEVELS[LEVELS.length - 1];
  const progress = lvl.max === Infinity ? 100 : ((points - lvl.min) / (lvl.max - lvl.min)) * 100;
  const nextThreshold = lvl.max === Infinity ? null : lvl.max;
  return { ...lvl, progress: Math.min(progress, 100), nextThreshold };
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

function useFadeIn(delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  return visible;
}

// Reusable fade wrapper
function FadeSlide({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const show = useFadeIn(delay);
  return (
    <div
      className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ${className}`}
    >
      {children}
    </div>
  );
}

// Lightning bolt icon
function BoltIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M11.25 1.25L3.75 11.25H10L8.75 18.75L16.25 8.75H10L11.25 1.25Z" fill="url(#bolt-grad)" stroke="url(#bolt-grad)" strokeWidth="0.5" strokeLinejoin="round" />
      <defs>
        <linearGradient id="bolt-grad" x1="3.75" y1="1.25" x2="16.25" y2="18.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── 1. PointsBalanceCard ───────────────────────────────────────────────────

export function PointsBalanceCard() {
  const totalPoints = 2450;
  const dailyEarned = 125;
  const dailyCap = 500;

  const displayPoints = useCountUp(totalPoints);
  const lvl = getLevelInfo(totalPoints);

  return (
    <FadeSlide>
      <div className="relative overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-600/8 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
              <BoltIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-gray-300">$CLDX Points</span>
          </div>
          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-400 tracking-wide">
            Lvl {lvl.level} &middot; {lvl.name}
          </span>
        </div>

        {/* Balance */}
        <div className="mb-5">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tracking-tight text-white tabular-nums">
              {displayPoints.toLocaleString()}
            </span>
            <span className="text-lg font-semibold text-gray-500">$CLDX</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Level {lvl.level}</span>
            {lvl.nextThreshold && (
              <span>{Math.round(lvl.progress)}% to Level {lvl.level + 1}</span>
            )}
            {!lvl.nextThreshold && <span>Max Level</span>}
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${lvl.progress}%` }}
            />
          </div>
          {lvl.nextThreshold && (
            <div className="flex justify-between text-[11px] text-gray-600 mt-1">
              <span>{lvl.min.toLocaleString()} $CLDX</span>
              <span>{lvl.nextThreshold.toLocaleString()} $CLDX</span>
            </div>
          )}
        </div>

        {/* Daily stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2.5L12 8.5H2L7 2.5Z" fill="#34d399" />
            </svg>
            <span className="text-sm font-medium text-emerald-400">+{dailyEarned} $CLDX today</span>
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
            <span className="text-xs text-gray-500">
              {dailyEarned}/{dailyCap} $CLDX daily limit
            </span>
          </div>
        </div>
      </div>
    </FadeSlide>
  );
}

// ─── 2. EarningsList ────────────────────────────────────────────────────────

interface EarningItem {
  emoji: string;
  action: string;
  reward: string;
  progress: number; // 0–100
  detail?: string;
}

const EARNINGS: EarningItem[] = [
  { emoji: '\u{1F680}', action: 'Deploy Agent', reward: '+100 $CLDX', progress: 100, detail: 'One-time per agent' },
  { emoji: '\u{1F4CA}', action: 'Daily Login', reward: '+25 $CLDX', progress: 100, detail: 'Claimed today' },
  { emoji: '\u{1F4B0}', action: 'Profitable Trade', reward: '+10 $CLDX/trade', progress: 60, detail: '6 trades today' },
  { emoji: '\u{1F381}', action: 'Gift an Agent', reward: '+5 $CLDX', progress: 0, detail: 'Not yet' },
  { emoji: '\u{1F465}', action: 'Refer a Friend', reward: '+500 $CLDX', progress: 20, detail: '2/10 referrals' },
  { emoji: '\u{1F3EA}', action: 'Use Marketplace Agent', reward: '+50 $CLDX', progress: 50, detail: '1 used today' },
];

export function EarningsList() {
  return (
    <FadeSlide delay={80}>
      <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">How to Earn $CLDX</h3>
        <div className="space-y-3">
          {EARNINGS.map((item, i) => (
            <FadeSlide key={item.action} delay={120 + i * 60}>
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-3 border border-transparent hover:border-white/[0.06] transition-colors">
                <span className="text-xl flex-shrink-0 w-8 text-center">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">{item.action}</span>
                    <span className="text-sm font-bold text-indigo-400 tabular-nums">{item.reward}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500/70 to-purple-500/70 transition-all duration-700"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-600 flex-shrink-0">{item.detail}</span>
                  </div>
                </div>
              </div>
            </FadeSlide>
          ))}
        </div>
      </div>
    </FadeSlide>
  );
}

// ─── 3. SpendingMenu ────────────────────────────────────────────────────────

interface SpendItem {
  emoji: string;
  name: string;
  cost: number;
  description: string;
  cta: string;
}

const SPEND_ITEMS: SpendItem[] = [
  { emoji: '\u{1F513}', name: 'Unlock Agent Slot', cost: 500, description: 'Deploy one more agent simultaneously', cta: 'Unlock' },
  { emoji: '\u26A1', name: 'Boost Agent (24hr)', cost: 100, description: 'Priority execution & lower latency', cta: 'Boost' },
  { emoji: '\u{1F48E}', name: 'Reduce Fees (-2%)', cost: 1000, description: 'Permanent fee reduction on all trades', cta: 'Redeem' },
  { emoji: '\u{1F3A8}', name: 'Premium Skin', cost: 250, description: 'Exclusive agent appearance & effects', cta: 'Get' },
  { emoji: '\u{1F3C6}', name: 'Featured in Leaderboard', cost: 2000, description: 'Spotlight your agent for 7 days', cta: 'Feature' },
];

export function SpendingMenu() {
  const currentBalance = 2450;

  return (
    <FadeSlide delay={120}>
      <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Spend $CLDX</h3>
          <span className="text-xs text-gray-500 tabular-nums">{currentBalance.toLocaleString()} $CLDX available</span>
        </div>
        <div className="space-y-2.5">
          {SPEND_ITEMS.map((item, i) => {
            const canAfford = currentBalance >= item.cost;
            return (
              <FadeSlide key={item.name} delay={180 + i * 60}>
                <div
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-200 ${
                    canAfford
                      ? 'bg-white/[0.02] border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]'
                      : 'bg-white/[0.01] border-transparent opacity-45'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 w-8 text-center">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200">{item.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs font-bold text-amber-400/80 tabular-nums">{item.cost} $CLDX</span>
                    <button
                      disabled={!canAfford}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                        canAfford
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95'
                          : 'bg-white/[0.05] text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {item.cta}
                    </button>
                  </div>
                </div>
              </FadeSlide>
            );
          })}
        </div>
      </div>
    </FadeSlide>
  );
}

// ─── 4. PointsWidget (compact sidebar) ──────────────────────────────────────

export function PointsWidget() {
  const points = 2450;
  const displayPoints = useCountUp(points, 900);
  const lvl = getLevelInfo(points);

  return (
    <FadeSlide>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10">
            <BoltIcon className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-white tabular-nums">{displayPoints.toLocaleString()}</span>
          <span className="text-xs text-gray-500 font-medium">$CLDX</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            {lvl.name}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${lvl.progress}%` }}
            />
          </div>
        </div>
        <a href="/dashboard/points" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer block">
          Earn More &rarr;
        </a>
      </div>
    </FadeSlide>
  );
}

// ─── 5. ReferralCard ────────────────────────────────────────────────────────

export function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://cladex.io/r/X7K9';
  const friendsJoined = 2;
  const friendsRequired = 3;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [referralLink]);

  return (
    <FadeSlide delay={160}>
      <div className="relative overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        {/* Amber glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-amber-500/8 blur-3xl" />

        <h3 className="text-base font-bold text-white mb-1">Invite friends, earn rewards</h3>
        <p className="text-sm text-gray-400 mb-5">
          Share your link — earn 500 $CLDX per friend who joins
        </p>

        {/* Referral link */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-gray-200 truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="flex h-10 px-3 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 hover:bg-[#B8FF3C]/20 transition-colors cursor-pointer"
            title="Copy referral link"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-medium text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#B8FF3C]" viewBox="0 0 20 20" fill="none">
                  <rect x="6" y="6" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 14V5a2 2 0 012-2h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-xs font-medium text-[#B8FF3C]">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Progress dots */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span className="tabular-nums">{friendsJoined}/{friendsRequired} friends joined</span>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: friendsRequired }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center justify-center">
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-500 ${
                    i < friendsJoined
                      ? 'bg-amber-400 shadow-lg shadow-amber-400/30'
                      : 'bg-white/[0.08]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all duration-200 active:scale-[0.98] cursor-pointer mb-4">
          Invite Friends
        </button>

        {/* Reward details */}
        <div className="space-y-1.5 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-amber-400/50" />
            <span>You get <span className="text-amber-400/80 font-medium">500 $CLDX + 1 agent slot</span> per 3 referrals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-gray-600" />
            <span>Max 10 referrals (5,000 $CLDX cap)</span>
          </div>
        </div>
      </div>
    </FadeSlide>
  );
}

// ─── 6. ProfitTriggerBanner ─────────────────────────────────────────────────

export function ProfitTriggerBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <FadeSlide>
      <div className="relative">
        {/* Banner */}
        <div
          onClick={() => setExpanded((p) => !p)}
          className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-[#111118] px-5 py-3 cursor-pointer transition-all duration-300 hover:border-emerald-500/30 group"
        >
          {/* Green glow */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />

          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <span className="text-lg">{'\u{1F4C8}'}</span>
              <span className="text-sm font-medium text-emerald-400">Your agent is performing well</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="none"
              >
                <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors text-gray-500 hover:text-gray-300 cursor-pointer"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded card */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            expanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6 relative overflow-hidden">
            {/* Glow */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-32 w-64 rounded-full bg-emerald-500/8 blur-3xl" />

            <div className="text-center relative mb-5">
              <div className="text-3xl font-extrabold text-white mb-1">
                You made <span className="text-emerald-400">+$42</span>
              </div>
              <p className="text-sm text-gray-400">Your agent is working exactly as designed</p>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">You keep</span>
                <span className="font-bold text-emerald-400 tabular-nums">$37</span>
              </div>
              <div className="h-px bg-white/[0.05]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Platform fee</span>
                <span className="font-medium text-gray-500 tabular-nums">$5</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-2">
              <button className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition-all duration-200 active:scale-[0.98] cursor-pointer">
                Continue Agent
              </button>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer py-1">
                Upgrade to reduce fees &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </FadeSlide>
  );
}
