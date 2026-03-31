'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, BarChart3, Target, Eye, Play, Pause, Square, MessageCircle,
  Send, Calendar, Rocket,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import { getDeployedAgents, updateAgentStatus, publishAgent, unpublishAgent } from '@/lib/agents-store';
import type { DeployedAgent } from '@/lib/agents-store';
import type { AgentPersonality } from '@/types';
import { api } from '@/lib/api';

// ---- Constants ----

const PERSONALITY_META: Record<AgentPersonality, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
}> = {
  guardian: { label: 'Guardian', icon: <Shield size={18} />, color: 'text-guardian-400', bgLight: 'bg-guardian-500/10' },
  analyst: { label: 'Analyst', icon: <BarChart3 size={18} />, color: 'text-analyst-400', bgLight: 'bg-analyst-500/10' },
  hunter: { label: 'Hunter', icon: <Target size={18} />, color: 'text-hunter-400', bgLight: 'bg-hunter-500/10' },
  oracle: { label: 'Oracle', icon: <Eye size={18} />, color: 'text-oracle-400', bgLight: 'bg-oracle-500/10' },
};

type AgentStatus = DeployedAgent['status'];

const STATUS_CONFIG: Record<AgentStatus, { label: string; dot: string; bg: string }> = {
  pending: { label: 'Deploying', dot: 'bg-amber-400 animate-pulse', bg: 'bg-amber-500/10 text-amber-400' },
  active: { label: 'Active', dot: 'bg-guardian-400 animate-pulse', bg: 'bg-guardian-500/10 text-guardian-400' },
  paused: { label: 'Paused', dot: 'bg-amber-400', bg: 'bg-amber-500/10 text-amber-400' },
  stopped: { label: 'Stopped', dot: 'bg-gray-500', bg: 'bg-gray-500/10 text-gray-400' },
};

// ---- Mock AI Ask responses ----

function getAskResponse(name: string, personality: AgentPersonality, question: string): string {
  const lower = question.toLowerCase();
  const tone = {
    hunter: {
      perf: `I'm hunting hard. Every dip is an opportunity, every breakout is mine. My win rate speaks for itself ⚡`,
      plan: `Watching 3 setups right now. SOL breakout, ETH pullback, and a LINK accumulation pattern. When they trigger, I strike 🎯`,
      default: `I don't explain, I execute. Check my P&L if you want proof 😏`,
    },
    oracle: {
      perf: `My models are aligned with the current cycle. Confidence is high. The patterns are speaking clearly 🔮`,
      plan: `I see convergence forming on BTC and ETH. The next 48 hours will be telling. I'm positioned accordingly ✨`,
      default: `The future reveals itself to those who listen. Ask me something specific and I'll share what I see 🔮`,
    },
    guardian: {
      perf: `Capital is protected. Drawdown minimal. I'm doing exactly what I was built to do — keep you safe 🛡️`,
      plan: `Monitoring risk across all positions. If volatility spikes, I hedge first, ask questions later. Your money is my priority 💚`,
      default: `I protect first, profit second. Everything is within safe parameters. Sleep easy 🛡️`,
    },
    analyst: {
      perf: `Data shows we're performing above the 90-day average. Win rate is trending up. The numbers don't lie 📊`,
      plan: `Running regression analysis on 12 pairs. 3 setups have positive expected value above my threshold. Will execute when confirmed 🧮`,
      default: `I process data, not emotions. Ask me about performance, risk, or strategy — I'll give you the facts 📊`,
    },
  };
  const t = tone[personality];
  if (lower.includes('performance') || lower.includes('how are')) return t.perf;
  if (lower.includes('next') || lower.includes('plan') || lower.includes('what')) return t.plan;
  return t.default;
}

// ---- Agent Card ----

function AgentCard({ agent }: { agent: DeployedAgent }) {
  const [status, setStatus] = useState<AgentStatus>(agent.status);
  const [askInput, setAskInput] = useState('');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [isPublished, setIsPublished] = useState(agent.published || false);
  const [pubDescription, setPubDescription] = useState(agent.description || '');
  const [pubPrice, setPubPrice] = useState(agent.price?.toString() || '15');
  const [publishing, setPublishing] = useState(false);
  const [pnl, setPnl] = useState(agent.pnl);
  const [trades, setTrades] = useState(agent.totalTrades);
  const [winRate, setWinRate] = useState(agent.winRate);

  // Simulate live P&L for active agents
  useEffect(() => {
    if (status !== 'active') return;
    const interval = setInterval(() => {
      setPnl(p => {
        const change = (Math.random() - 0.45) * 15;
        return Math.round((p + change) * 100) / 100;
      });
      if (Math.random() > 0.7) {
        setTrades(t => t + 1);
        setWinRate(w => Math.min(100, Math.max(30, w + (Math.random() > 0.4 ? 0.3 : -0.2))));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  const meta = PERSONALITY_META[agent.personality];
  const statusCfg = STATUS_CONFIG[status];
  const isPositive = pnl >= 0;
  const isPending = status === 'pending';

  const [statusLoading, setStatusLoading] = useState(false);

  const handleStatusChange = async (newStatus: AgentStatus) => {
    if (statusLoading) return;
    setStatusLoading(true);
    const backendStatusMap: Record<AgentStatus, string> = {
      active: 'RUNNING',
      paused: 'PAUSED',
      stopped: 'STOPPED',
      pending: 'RUNNING',
    };
    try {
      await api.patch(`/agents/${agent.id}`, { status: backendStatusMap[newStatus] });
      setStatus(newStatus);
      updateAgentStatus(agent.id, newStatus);
    } catch {
      // Fallback to localStorage-only update if API fails
      setStatus(newStatus);
      updateAgentStatus(agent.id, newStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAsk = () => {
    const text = askInput.trim();
    if (!text || isAsking) return;
    setIsAsking(true);
    setAskResponse(null);
    setTimeout(() => {
      setAskResponse(getAskResponse(agent.name, agent.personality, text));
      setIsAsking(false);
    }, 800 + Math.random() * 600);
  };

  const handlePublish = () => {
    if (!pubDescription.trim()) return;
    setPublishing(true);
    setTimeout(() => {
      publishAgent(agent.id, pubDescription.trim(), parseFloat(pubPrice) || 15);
      setIsPublished(true);
      setPublishing(false);
      setShowPublish(false);
    }, 1500);
  };

  const handleUnpublish = () => {
    unpublishAgent(agent.id);
    setIsPublished(false);
  };

  const createdDate = new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className={`bg-[#111118] rounded-2xl border overflow-hidden transition-all duration-300 hover:border-[#2e2e3e] ${
      isPending ? 'border-amber-500/20' : 'border-[#1e1e2e]'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <AgentAvatar personality={agent.personality} size={52} active={status === 'active'} />
            <div>
              <h3 className="text-base font-bold text-white">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={agent.personality} size="sm">{meta.label}</Badge>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${statusCfg.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
                {isPublished && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isPending && (
            <div className="text-right">
              <div className={`text-lg font-bold ${isPositive ? 'text-guardian-400' : 'text-hunter-400'}`}>
                {isPositive ? '+' : ''}${pnl.toFixed(2)}
              </div>
              <div className={`text-xs ${isPositive ? 'text-guardian-400/60' : 'text-hunter-400/60'}`}>
                {isPositive ? '+' : ''}{agent.pnlPercent}%
              </div>
            </div>
          )}

          {isPending && (
            <div className="text-right">
              <span className="text-xs text-amber-400 font-medium">Awaiting deployment</span>
            </div>
          )}
        </div>

        {/* Pending banner */}
        {isPending && (
          <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-3 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <span className="text-xs text-amber-300">Your agent is being deployed on-chain. You&apos;ll be notified when it&apos;s live.</span>
          </div>
        )}

        {/* Stats */}
        {!isPending && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-gray-500 mb-0.5">Trades</div>
              <div className="text-sm font-semibold text-white">{trades}</div>
            </div>
            <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-gray-500 mb-0.5">Win Rate</div>
              <div className="text-sm font-semibold text-white">{winRate.toFixed(0)}%</div>
            </div>
            <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Calendar size={8} /> Deployed</div>
              <div className="text-sm font-semibold text-white">{createdDate}</div>
            </div>
            <div className="bg-[#0a0a0f] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-gray-500 mb-0.5">Plan</div>
              <div className="text-sm font-semibold text-white">{agent.plan}</div>
            </div>
          </div>
        )}

        {/* Wallet + Assets */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {agent.walletAddress && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 text-[10px] text-emerald-400 font-medium">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M22 10H18a2 2 0 000 4h4" /></svg>
              {agent.walletAddress}
            </span>
          )}
          {!agent.walletAddress && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-500 font-medium">
              Custodial (Gas Balance)
            </span>
          )}
          <div className="flex items-center gap-1">
            {agent.assets.map(a => (
              <span key={a} className="px-1.5 py-0.5 rounded-md bg-[#0a0a0f] border border-[#2a2a3a] text-[10px] text-gray-400 font-medium">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!isPending && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {status !== 'active' && (
                <button onClick={() => handleStatusChange('active')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-guardian-400 bg-guardian-500/10 hover:bg-guardian-500/20 border border-guardian-500/20 transition-all">
                  <Play size={12} /> Start
                </button>
              )}
              {status === 'active' && (
                <button onClick={() => handleStatusChange('paused')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all">
                  <Pause size={12} /> Pause
                </button>
              )}
              {status !== 'stopped' && (
                <button onClick={() => handleStatusChange('stopped')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 transition-all">
                  <Square size={12} /> Stop
                </button>
              )}
              <button
                onClick={() => { setShowAsk(!showAsk); setAskResponse(null); if (showPublish) setShowPublish(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  showAsk ? 'text-[#B8FF3C] bg-[#B8FF3C]/10 border-[#B8FF3C]/20' : 'text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20'
                }`}
              >
                <MessageCircle size={12} /> Ask
              </button>
              {status === 'active' && !isPublished && (
                <button
                  onClick={() => { setShowPublish(!showPublish); if (showAsk) setShowAsk(false); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    showPublish ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  Publish
                </button>
              )}
              {isPublished && (
                <button
                  onClick={handleUnpublish}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400/60 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all"
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ask section */}
      {showAsk && !isPending && (
        <div className="px-5 pb-4 border-t border-[#1e1e2e]">
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <AgentAvatar personality={agent.personality} size={18} active />
              <span className={`text-xs font-medium ${PERSONALITY_META[agent.personality].color}`}>Ask {agent.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={askInput}
                onChange={e => setAskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
                placeholder={`e.g. "What's your next move?"`}
                className="flex-1 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-[#B8FF3C]/50 transition-all"
              />
              <Button size="sm" onClick={handleAsk} disabled={!askInput.trim() || isAsking} icon={<Send size={12} />}>
                Ask
              </Button>
            </div>
            {isAsking && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            {askResponse && (
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl p-3 text-xs text-gray-300 leading-relaxed">
                <div className="flex items-center gap-1.5 mb-2">
                  <AgentAvatar personality={agent.personality} size={14} active />
                  <span className={`text-[10px] font-medium ${PERSONALITY_META[agent.personality].color}`}>{agent.name}</span>
                </div>
                {askResponse}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish section */}
      {showPublish && !isPending && !isPublished && (
        <div className="px-5 pb-5 border-t border-[#1e1e2e]">
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span className="text-xs font-semibold text-purple-400">Publish to Marketplace</span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">
              List {agent.name} on the Explore page. Other users can subscribe and copy your agent&apos;s strategy. You earn revenue from each subscriber.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">Description</label>
                <textarea
                  value={pubDescription}
                  onChange={e => setPubDescription(e.target.value)}
                  placeholder={`Describe what ${agent.name} does, its strategy, and why traders should subscribe...`}
                  rows={3}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">Monthly Price (USD)</label>
                <div className="flex items-center gap-2">
                  {['5', '15', '25', '50'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPubPrice(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        pubPrice === p
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300'
                      }`}
                    >
                      ${p}/mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue preview */}
            <div className="rounded-lg bg-purple-500/[0.04] border border-purple-500/15 p-3 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Per subscriber</span>
                <span className="font-semibold text-purple-400">${pubPrice}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-400">You keep (70%)</span>
                <span className="font-semibold text-emerald-400">${(parseFloat(pubPrice || '0') * 0.7).toFixed(2)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-400">10 subscribers =</span>
                <span className="font-bold text-white">${(parseFloat(pubPrice || '0') * 0.7 * 10).toFixed(0)}/mo</span>
              </div>
            </div>

            <button
              onClick={handlePublish}
              disabled={!pubDescription.trim() || publishing}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Publishing...
                </>
              ) : (
                <>Publish {agent.name} to Marketplace</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Published info */}
      {isPublished && (
        <div className="px-5 pb-4 border-t border-[#1e1e2e]">
          <div className="pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span className="text-[11px] text-purple-400 font-medium">Live on Marketplace</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-gray-500">${agent.price || 15}/mo</span>
              <span className="text-gray-500">{agent.subscribers || 0} subscribers</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Empty State ----

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mb-6">
        <Rocket size={36} className="text-[#B8FF3C]" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No agents deployed yet</h2>
      <p className="text-sm text-gray-400 max-w-md mb-8 leading-relaxed">
        Deploy your first AI trading agent on-chain. Choose a plan, connect your wallet, and your agent will be minted as an NFT that you own forever.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="px-6 py-3 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#B8FF3C]/20"
        >
          Get a Deployment Plan
        </Link>
        <Link
          href="/dashboard/build"
          className="px-6 py-3 rounded-xl border border-white/[0.08] text-sm font-medium text-gray-300 hover:bg-white/[0.04] transition-all"
        >
          Build Custom Agent
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
        {[
          { icon: '🛡️', label: 'You own the NFT' },
          { icon: '💰', label: 'Trades 24/7' },
          { icon: '🔗', label: 'On-chain forever' },
        ].map(item => (
          <div key={item.label} className="text-center">
            <span className="text-2xl block mb-1">{item.icon}</span>
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main Page ----

// Map backend status to frontend status
function mapBackendStatus(status: string): AgentStatus {
  const map: Record<string, AgentStatus> = {
    RUNNING: 'active',
    PAUSED: 'paused',
    STOPPED: 'stopped',
  };
  return map[status] || 'active';
}

// Map backend personality to frontend personality
function mapBackendPersonality(personality: string): AgentPersonality {
  return personality.toLowerCase() as AgentPersonality;
}

// Convert a backend agent to the DeployedAgent format
function backendToDeployedAgent(agent: Record<string, unknown>): DeployedAgent {
  return {
    id: agent.id as string,
    name: agent.name as string,
    personality: mapBackendPersonality(agent.personality as string),
    status: mapBackendStatus(agent.status as string),
    plan: (agent as Record<string, unknown>).plan as string || 'Trader',
    walletAddress: null,
    deployMethod: 'gas-balance',
    pnl: (agent.profit as number) || 0,
    pnlPercent: 0,
    totalTrades: (agent.totalTrades as number) || 0,
    winRate: 0,
    assets: (agent.assets as string[]) || [],
    createdAt: new Date(agent.createdAt as string).getTime(),
    strategy: (agent as Record<string, unknown>).strategy as string || undefined,
  };
}

export default function MyAgentsPage() {
  const [agents, setAgents] = useState<DeployedAgent[]>([]);

  const refresh = useCallback(async () => {
    // Start with localStorage agents
    const localAgents = getDeployedAgents();

    try {
      const data = await api.get<{ agents: Record<string, unknown>[] }>('/agents');
      const backendAgents = (data.agents || []).map(backendToDeployedAgent);

      // Merge: use backend agents as primary, add localStorage-only agents (by id)
      const backendIds = new Set(backendAgents.map(a => a.id));
      const localOnly = localAgents.filter(a => !backendIds.has(a.id));

      // For backend agents that also exist in localStorage, preserve localStorage fields (plan, walletAddress, etc.)
      const merged = backendAgents.map(ba => {
        const local = localAgents.find(la => la.id === ba.id);
        if (local) {
          return {
            ...ba,
            plan: local.plan || ba.plan,
            walletAddress: local.walletAddress,
            deployMethod: local.deployMethod,
            pnlPercent: local.pnlPercent || ba.pnlPercent,
            winRate: local.winRate || ba.winRate,
            strategy: local.strategy || ba.strategy,
            published: local.published,
            publishedAt: local.publishedAt,
            subscribers: local.subscribers,
            description: local.description,
            price: local.price,
          };
        }
        return ba;
      });

      setAgents([...merged, ...localOnly]);
    } catch {
      // If API fails, fall back to localStorage only
      setAgents(localAgents);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('cladex_agents_updated', refresh);
    return () => window.removeEventListener('cladex_agents_updated', refresh);
  }, [refresh]);

  // Simulate pending agents going active after 30s
  useEffect(() => {
    const pending = agents.filter(a => a.status === 'pending');
    if (pending.length === 0) return;
    const timeout = setTimeout(() => {
      pending.forEach(a => updateAgentStatus(a.id, 'active'));
      refresh();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [agents, refresh]);

  if (agents.length === 0) {
    return <EmptyState />;
  }

  const totalPnl = agents.reduce((sum, a) => sum + a.pnl, 0);
  const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
  const activeCount = agents.filter(a => a.status === 'active').length;
  const pendingCount = agents.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">My Agents</h1>
          <p className="text-sm text-gray-500">Your deployed on-chain trading agents</p>
        </div>
        <Link href="/pricing" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B8FF3C] text-black text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-[#B8FF3C]/15">
          <Rocket size={14} /> Deploy Agent
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
          <div className="text-xs text-gray-500 mb-1">Total Agents</div>
          <div className="text-xl font-bold text-white">{agents.length}</div>
        </div>
        <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
          <div className="text-xs text-gray-500 mb-1">Active</div>
          <div className="text-xl font-bold text-guardian-400">
            {activeCount}
            {pendingCount > 0 && <span className="text-xs text-amber-400 ml-1">+{pendingCount} pending</span>}
          </div>
        </div>
        <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
          <div className="text-xs text-gray-500 mb-1">Total P&L</div>
          <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-guardian-400' : 'text-hunter-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#111118] rounded-xl p-4 border border-[#1e1e2e]">
          <div className="text-xs text-gray-500 mb-1">Total Trades</div>
          <div className="text-xl font-bold text-white">{totalTrades}</div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
