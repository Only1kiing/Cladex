'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

/* ── Helpers ──────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return value;
}

/* ── Icons ────────────────────────────────────────────────────────── */

function BoltIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 20 20" fill="none">
      <path d="M11.25 1.25L3.75 11.25H10L8.75 18.75L16.25 8.75H10L11.25 1.25Z" fill="url(#bolt)" stroke="url(#bolt)" strokeWidth="0.5" strokeLinejoin="round" />
      <defs>
        <linearGradient id="bolt" x1="3.75" y1="1.25" x2="16.25" y2="18.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Data ─────────────────────────────────────────────────────────── */

const LEVELS = [
  { level: 1, name: 'Rookie', min: 0, max: 1000, color: 'text-gray-400' },
  { level: 2, name: 'Trader', min: 1000, max: 3000, color: 'text-emerald-400' },
  { level: 3, name: 'Pro Trader', min: 3000, max: 7000, color: 'text-blue-400' },
  { level: 4, name: 'Elite', min: 7000, max: 15000, color: 'text-purple-400' },
  { level: 5, name: 'Whale', min: 15000, max: Infinity, color: 'text-yellow-400' },
];

const SPEND_OPTIONS = [
  { emoji: '🔓', name: 'Unlock Agent Slot', cost: 500, desc: 'Deploy one more agent simultaneously' },
  { emoji: '⚡', name: 'Boost Agent (24hr)', cost: 100, desc: 'Priority execution & lower latency for 24 hours' },
  { emoji: '💎', name: 'Reduce Fees (-2%)', cost: 1000, desc: 'Permanent fee reduction on all your trades' },
  { emoji: '🏆', name: 'Featured in Leaderboard', cost: 2000, desc: 'Spotlight your agent for 7 days' },
];

const AIRDROP_TIERS = [
  { plan: 'Trader ($25)', allocation: 'Base allocation', multiplier: '1x', color: 'border-gray-600' },
  { plan: 'Builder ($80)', allocation: 'Higher allocation', multiplier: '3x', color: 'border-[#B8FF3C]/40' },
  { plan: 'Pro Creator ($200)', allocation: 'Maximum allocation', multiplier: '5x', color: 'border-purple-500/40' },
];

const AIRDROP_BOOSTERS = [
  { action: 'Active trading volume', boost: '+10% per $10K traded' },
  { action: 'Agent performance (top 100)', boost: '+25% bonus' },
  { action: 'Referral count', boost: '+5% per referral' },
  { action: '$CLDX balance at snapshot', boost: '+1% per 1,000 $CLDX' },
  { action: 'Account age', boost: '+2% per month active' },
];

interface PointsData {
  totalPoints: number;
  foundingPoints: number;
  totalEarned: number;
  breakdown: {
    agents: { count: number; points: number };
    trades: { count: number; total: number; points: number };
    exchange: { connected: boolean; points: number };
    logins: { days: number; points: number };
  };
  accountAge: number;
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function PointsPage() {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [activeTab, setActiveTab] = useState<'earn' | 'spend' | 'airdrop'>('earn');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<PointsData>('/dashboard/points');
        setPointsData(data);
      } catch {
        // Backend unreachable
      }
    })();
  }, []);

  const totalPoints = pointsData?.totalPoints || 0;
  const displayPoints = useCountUp(totalPoints);
  const currentLevel = LEVELS.find((l) => totalPoints >= l.min && totalPoints < l.max) ?? LEVELS[LEVELS.length - 1];
  const progress = currentLevel.max === Infinity ? 100 : ((totalPoints - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
  const nextLevel = LEVELS.find((l) => l.min > totalPoints);

  const earnMethods = [
    {
      emoji: '🎁', action: 'Founding Points', reward: `${(pointsData?.foundingPoints || 0).toLocaleString()} $CLDX`,
      desc: 'Welcome bonus for early adopters.',
      progress: pointsData?.foundingPoints ? 100 : 0,
    },
    {
      emoji: '🚀', action: 'Deploy Agents', reward: `+${pointsData?.breakdown.agents.points || 0} $CLDX`,
      desc: `${pointsData?.breakdown.agents.count || 0} agents deployed (+100 each)`,
      progress: Math.min((pointsData?.breakdown.agents.count || 0) * 20, 100),
    },
    {
      emoji: '💰', action: 'Profitable Trades', reward: `+${pointsData?.breakdown.trades.points || 0} $CLDX`,
      desc: `${pointsData?.breakdown.trades.count || 0} profitable out of ${pointsData?.breakdown.trades.total || 0} total (+10 each)`,
      progress: pointsData?.breakdown.trades.total ? Math.round((pointsData.breakdown.trades.count / pointsData.breakdown.trades.total) * 100) : 0,
    },
    {
      emoji: '🔗', action: 'Connect Exchange', reward: pointsData?.breakdown.exchange.connected ? '+50 $CLDX' : '0 $CLDX',
      desc: pointsData?.breakdown.exchange.connected ? 'Exchange connected!' : 'Connect your exchange to earn 50 $CLDX',
      progress: pointsData?.breakdown.exchange.connected ? 100 : 0,
    },
    {
      emoji: '📊', action: 'Daily Activity', reward: `+${pointsData?.breakdown.logins.points || 0} $CLDX`,
      desc: `${pointsData?.breakdown.logins.days || 0} days active (+25/day, max 30 days)`,
      progress: Math.min(((pointsData?.breakdown.logins.days || 0) / 30) * 100, 100),
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Points & Rewards</h1>
        <p className="text-sm text-gray-400 mt-1">Earn $CLDX Points, unlock rewards, and qualify for the $CLADEX token airdrop</p>
      </div>

      {/* Points Overview Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-purple-600/[0.08] blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <BoltIcon />
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                {pointsData ? displayPoints.toLocaleString() : '—'} <span className="text-lg font-medium text-gray-500">$CLDX</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/15 ${currentLevel.color}`}>
                  {currentLevel.name}
                </span>
                <span className="text-xs text-gray-500">Level {currentLevel.level}</span>
              </div>
            </div>
          </div>

          {nextLevel && (
            <div className="sm:w-60">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>Next: {nextLevel.name}</span>
                <span>{nextLevel.min.toLocaleString()} $CLDX</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">{(nextLevel.min - totalPoints).toLocaleString()} $CLDX to go</p>
            </div>
          )}
        </div>

        {/* Summary */}
        {pointsData && (
          <div className="relative mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{pointsData.foundingPoints.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">Founding</p>
                </div>
                <span className="text-gray-700">+</span>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{pointsData.totalEarned.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">Earned</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Account age</p>
                <p className="text-sm font-semibold text-gray-300">{pointsData.accountAge} days</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {[
          { id: 'earn' as const, label: 'Earn $CLDX', icon: '💰' },
          { id: 'spend' as const, label: 'Spend $CLDX', icon: '🛒' },
          { id: 'airdrop' as const, label: '$CLADEX Airdrop', icon: '🪂' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== EARN TAB ===== */}
      {activeTab === 'earn' && (
        <div className="space-y-3">
          {earnMethods.map((item) => (
            <div key={item.action} className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 hover:border-white/[0.08] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl w-10 text-center shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-200">{item.action}</span>
                    <span className="text-sm font-bold text-indigo-400 tabular-nums">{item.reward}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500/70 to-purple-500/70"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== SPEND TAB ===== */}
      {activeTab === 'spend' && (
        <div className="space-y-3">
          {SPEND_OPTIONS.map((item) => (
            <div key={item.name} className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-4 hover:border-white/[0.08] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl w-10 text-center shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-200">{item.name}</span>
                    <span className="text-sm font-bold text-indigo-400 tabular-nums">{item.cost} $CLDX</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  disabled={totalPoints < item.cost}
                  className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-[#B8FF3C] hover:bg-[#B8FF3C]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Redeem
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== AIRDROP TAB ===== */}
      {activeTab === 'airdrop' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.05] p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🪂</span>
                <h2 className="text-xl font-bold text-white">$CLADEX Token Airdrop</h2>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                The $CLADEX utility token powers the Cladex ecosystem — governance, fee discounts, staking rewards, and premium features. All deployment plan holders are automatically eligible. Your allocation depends on your plan, activity, and $CLDX balance.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-gray-500">Snapshot date: TBA</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Allocation by Deployment Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AIRDROP_TIERS.map((tier) => (
                <div key={tier.plan} className={`rounded-xl border ${tier.color} bg-[#111118] p-4 text-center`}>
                  <p className="text-sm font-semibold text-gray-200 mb-1">{tier.plan}</p>
                  <p className="text-2xl font-black text-white">{tier.multiplier}</p>
                  <p className="text-xs text-gray-500 mt-1">{tier.allocation}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Boost Your Allocation</h3>
            <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] divide-y divide-[#1e1e2e]">
              {AIRDROP_BOOSTERS.map((item) => (
                <div key={item.action} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-300">{item.action}</span>
                  <span className="text-sm font-semibold text-[#B8FF3C]">{item.boost}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-[#B8FF3C] text-black shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 hover:brightness-110 transition-all"
            >
              Get a Deployment Plan
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Level Guide */}
      <div className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Level Guide</h3>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {LEVELS.map((lvl, i) => (
            <div key={lvl.name} className="flex items-center gap-2 shrink-0">
              <div className={`rounded-lg px-3 py-2 text-center border ${lvl.level <= currentLevel.level ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-[#1e1e2e] bg-white/[0.02]'}`}>
                <p className={`text-xs font-bold ${lvl.level <= currentLevel.level ? 'text-indigo-400' : 'text-gray-600'}`}>Lv{lvl.level}</p>
                <p className={`text-[10px] font-medium ${lvl.level <= currentLevel.level ? 'text-gray-300' : 'text-gray-600'}`}>{lvl.name}</p>
                <p className="text-[9px] text-gray-600">{lvl.max === Infinity ? '15K+' : `${(lvl.min / 1000).toFixed(0)}K-${(lvl.max / 1000).toFixed(0)}K`}</p>
              </div>
              {i < LEVELS.length - 1 && (
                <svg className="w-4 h-4 text-gray-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-600 text-center">
        For demonstration purposes only. Past performance does not guarantee future results. Trading involves risk.
      </p>
    </div>
  );
}
