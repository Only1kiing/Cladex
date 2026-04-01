'use client';

import React, { useState, useMemo } from 'react';
import { Search, Shield, BarChart3, Target, Eye, TrendingUp, Users, Activity, ArrowRight, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import type { AgentPersonality } from '@/types';

// ---- Types ----

interface MarketplaceAgent {
  id: string;
  name: string;
  creator: string;
  personality: AgentPersonality;
  description: string;
  monthlyReturn: number;
  winRate: number;
  totalTrades: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  assets: string[];
  users: number;
  rating: number;
  featured?: boolean;
  price: number; // 0 = free, >0 = monthly subscription in USD
}

// ---- Constants ----

const PERSONALITY_META: Record<AgentPersonality, {
  label: string;
  icon: React.ReactNode;
  color: string;
  accentBar: string;
  bgGlow: string;
}> = {
  nova: {
    label: 'Nova',
    icon: <Shield size={16} />,
    color: 'text-nova-400',
    accentBar: 'bg-gradient-to-r from-nova-500 to-nova-400',
    bgGlow: 'group-hover:shadow-nova-500/10',
  },
  sage: {
    label: 'Sage',
    icon: <BarChart3 size={16} />,
    color: 'text-sage-400',
    accentBar: 'bg-gradient-to-r from-sage-500 to-sage-400',
    bgGlow: 'group-hover:shadow-sage-500/10',
  },
  apex: {
    label: 'Apex',
    icon: <Target size={16} />,
    color: 'text-apex-400',
    accentBar: 'bg-gradient-to-r from-apex-500 to-apex-400',
    bgGlow: 'group-hover:shadow-apex-500/10',
  },
  echo: {
    label: 'Echo',
    icon: <Eye size={16} />,
    color: 'text-echo-400',
    accentBar: 'bg-gradient-to-r from-echo-500 to-echo-400',
    bgGlow: 'group-hover:shadow-echo-500/10',
  },
};

const RISK_STYLES: Record<string, string> = {
  Low: 'text-nova-400 bg-nova-500/10',
  Medium: 'text-amber-400 bg-amber-500/10',
  High: 'text-apex-400 bg-apex-500/10',
};

const MOCK_AGENTS: MarketplaceAgent[] = [
  {
    id: '1',
    name: 'Raze',
    creator: 'CladexTeam',
    personality: 'apex',
    description: 'Aggressive momentum scalper that hunts volatile breakouts with lightning-fast entries and tight trailing stops.',
    monthlyReturn: 18,
    winRate: 64,
    totalTrades: 8742,
    riskLevel: 'High',
    assets: ['SOL', 'AVAX', 'LINK'],
    users: 2187,
    rating: 4.3,
    price: 0,
  },
  {
    id: '2',
    name: 'Knox',
    creator: 'CladexTeam',
    personality: 'nova',
    description: 'Capital preservation specialist focused on minimizing drawdown while steadily compounding returns.',
    monthlyReturn: 6,
    winRate: 81,
    totalTrades: 1247,
    riskLevel: 'Low',
    assets: ['BTC', 'ETH'],
    users: 5234,
    rating: 4.9,
    price: 0,
  },
  {
    id: '3',
    name: 'Byte',
    creator: 'CladexTeam',
    personality: 'sage',
    description: 'Data-driven trend follower using cross-exchange volume analysis and momentum indicators for precise entries.',
    monthlyReturn: 12,
    winRate: 72,
    totalTrades: 2156,
    riskLevel: 'Medium',
    assets: ['BTC', 'ETH', 'SOL'],
    users: 3421,
    rating: 4.6,
    featured: true,
    price: 15,
  },
  {
    id: '4',
    name: 'Iris',
    creator: 'CladexTeam',
    personality: 'echo',
    description: 'Predictive pattern recognition engine using on-chain analytics, whale tracking, and historical cycle data.',
    monthlyReturn: 22,
    winRate: 69,
    totalTrades: 1583,
    riskLevel: 'Medium',
    assets: ['BTC', 'ETH', 'SOL', 'DOT'],
    users: 1845,
    rating: 4.7,
    featured: true,
    price: 25,
  },
  {
    id: '5',
    name: 'Nova',
    creator: 'CladexTeam',
    personality: 'apex',
    description: 'High-frequency breakout trader specializing in rapid multi-asset scalps with sub-second execution.',
    monthlyReturn: 15,
    winRate: 58,
    totalTrades: 6891,
    riskLevel: 'High',
    assets: ['SOL', 'AVAX', 'MATIC'],
    users: 987,
    rating: 4.2,
    price: 10,
  },
  {
    id: '6',
    name: 'Luna',
    creator: 'CladexTeam',
    personality: 'echo',
    description: 'Cosmic cycle predictor leveraging macro patterns, lunar cycles, and sentiment oscillation models.',
    monthlyReturn: 19,
    winRate: 74,
    totalTrades: 1893,
    riskLevel: 'Medium',
    assets: ['BTC', 'ETH', 'SOL'],
    users: 1534,
    rating: 4.5,
    price: 20,
  },
  {
    id: '7',
    name: 'Shield',
    creator: 'CladexTeam',
    personality: 'nova',
    description: 'Maximum drawdown protection agent that prioritizes capital safety above all else with zero-tolerance risk limits.',
    monthlyReturn: 4,
    winRate: 88,
    totalTrades: 456,
    riskLevel: 'Low',
    assets: ['BTC', 'ETH'],
    users: 4102,
    rating: 4.8,
    price: 0,
  },
  {
    id: '8',
    name: 'Cipher',
    creator: 'CladexTeam',
    personality: 'sage',
    description: 'On-chain intelligence engine tracking wallet clusters, whale movements, and institutional accumulation patterns.',
    monthlyReturn: 28,
    winRate: 66,
    totalTrades: 2341,
    riskLevel: 'High',
    assets: ['BTC', 'ETH', 'SOL', 'LINK'],
    users: 1256,
    rating: 4.4,
    featured: true,
    price: 30,
  },
  {
    id: '9',
    name: 'Blitz',
    creator: 'CladexTeam',
    personality: 'apex',
    description: 'Speed-optimized scalper built for rapid-fire trades on high-volume pairs with ultra-low latency execution.',
    monthlyReturn: 14,
    winRate: 61,
    totalTrades: 3267,
    riskLevel: 'High',
    assets: ['SOL', 'AVAX', 'MATIC', 'DOT'],
    users: 672,
    rating: 3.9,
    price: 10,
  },
];

type FilterType = 'all' | AgentPersonality;

// ---- Agent Card Component ----

function AgentCard({ agent, onUse, onPreview }: { agent: MarketplaceAgent; onUse: () => void; onPreview: () => void }) {
  const meta = PERSONALITY_META[agent.personality];

  return (
    <div className={`group relative bg-[#111118] rounded-2xl border border-[#1e1e2e] overflow-hidden transition-all duration-300 hover:border-[#2e2e3e] hover:shadow-2xl hover:-translate-y-1 ${meta.bgGlow}`}>
      {/* Accent bar */}
      <div className={`h-1 ${meta.accentBar}`} />

      {/* Featured badge */}
      {agent.featured && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-medium text-amber-400">Featured</span>
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Avatar + Header */}
        <div className="flex justify-center mb-3">
          <AgentAvatar personality={agent.personality} size={48} />
        </div>
        <div className="mb-3 text-center">
          <h3 className="text-base font-bold text-white mb-0.5">{agent.name}</h3>
          <p className="text-xs text-gray-500">
            by <span className={agent.creator === 'CladexTeam' ? 'text-[#B8FF3C]' : 'text-gray-400'}>{agent.creator}</span>
          </p>
        </div>

        {/* Personality badge */}
        <div className="mb-3">
          <Badge variant={agent.personality} size="sm" dot>
            {meta.label}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
          {agent.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-4">
          <div className="bg-[#0a0a0f] rounded-lg px-1.5 sm:px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp size={10} className="text-nova-400" />
              <span className="text-[10px] text-gray-500 hidden sm:inline">Return</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-nova-400">+{agent.monthlyReturn}%</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-1.5 sm:px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Activity size={10} className="text-sage-400" />
              <span className="text-[10px] text-gray-500 hidden sm:inline">Win Rate</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-200">{agent.winRate}%</div>
          </div>
          <div className="bg-[#0a0a0f] rounded-lg px-1.5 sm:px-2.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Zap size={10} className="text-echo-400" />
              <span className="text-[10px] text-gray-500 hidden sm:inline">Trades</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-200">{agent.totalTrades.toLocaleString()}</div>
          </div>
        </div>

        {/* Risk + Users row */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${RISK_STYLES[agent.riskLevel]}`}>
            {agent.riskLevel} Risk
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} />
            <span>{agent.users.toLocaleString()} users</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          {agent.price === 0 ? (
            <span className="text-sm font-bold text-nova-400">FREE</span>
          ) : (
            <span className="text-sm font-bold text-white">${agent.price}<span className="text-xs font-normal text-gray-500">/mo</span></span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {agent.price === 0 ? (
            <Button onClick={onUse} size="sm" fullWidth>
              Use Agent
            </Button>
          ) : (
            <Button onClick={onUse} size="sm" fullWidth>
              Subscribe &mdash; ${agent.price}/mo
            </Button>
          )}
          <button
            onClick={onPreview}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all"
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showAllLeague, setShowAllLeague] = useState(false);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [previewAgent, setPreviewAgent] = useState<MarketplaceAgent | null>(null);
  const [useAgent, setUseAgent] = useState<MarketplaceAgent | null>(null);

  const leaderboardAgents = [
    { name: 'Raze', volume: '$1.2M', roi: '+34%', creator: '@hunter_x', personality: 'apex', loves: 2847 },
    { name: 'Iris', volume: '$890K', roi: '+28%', creator: '@oracle_queen', personality: 'echo', loves: 2103 },
    { name: 'Knox', volume: '$650K', roi: '+19%', creator: '@shield_master', personality: 'nova', loves: 1876 },
    { name: 'Nova', volume: '$420K', roi: '+42%', creator: '@speed_demon', personality: 'apex', loves: 1654 },
    { name: 'Byte', volume: '$380K', roi: '+15%', creator: '@data_nerd', personality: 'sage', loves: 1432 },
    { name: 'Luna', volume: '$310K', roi: '+22%', creator: '@moon_caller', personality: 'echo', loves: 1201 },
    { name: 'Shield', volume: '$280K', roi: '+11%', creator: '@safe_hands', personality: 'nova', loves: 987 },
    { name: 'Poly', volume: '$240K', roi: '+31%', creator: '@prediction_king', personality: 'sage', loves: 876 },
  ];

  const filteredAgents = useMemo(() => {
    return MOCK_AGENTS.filter((agent) => {
      const matchesFilter = activeFilter === 'all' || agent.personality === activeFilter;
      const matchesSearch =
        !searchQuery ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.creator.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [searchQuery, activeFilter]);

  const filters: { id: FilterType; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'All Agents' },
    { id: 'nova', label: 'Nova', icon: <Shield size={14} /> },
    { id: 'sage', label: 'Sage', icon: <BarChart3 size={14} /> },
    { id: 'apex', label: 'Apex', icon: <Target size={14} /> },
    { id: 'echo', label: 'Echo', icon: <Eye size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Top Agent League */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F7A600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0012 0V2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-100">Top Agent League</h2>
            </div>
            <span className="text-[10px] text-gray-500">{leaderboardAgents.length} agents ranked</span>
          </div>

          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {leaderboardAgents.slice(0, 3).map((agent, idx) => {
              const rank = idx + 1;
              const medalColors = ['from-amber-400 to-yellow-500', 'from-gray-300 to-gray-400', 'from-amber-600 to-amber-700'];
              const borderColors = ['border-amber-500/30', 'border-gray-400/20', 'border-amber-700/20'];
              const bgColors = ['bg-amber-500/[0.06]', 'bg-gray-400/[0.04]', 'bg-amber-700/[0.04]'];
              const personalityColor = agent.personality === 'apex' ? 'text-red-400' : agent.personality === 'echo' ? 'text-violet-400' : agent.personality === 'nova' ? 'text-emerald-400' : 'text-cyan-400';

              return (
                <div
                  key={agent.name}
                  className={`rounded-xl border ${borderColors[idx]} ${bgColors[idx]} p-4 text-center relative overflow-hidden transition-all hover:scale-[1.02]`}
                >
                  {/* Rank medal */}
                  <div className={`mx-auto w-8 h-8 rounded-full bg-gradient-to-b ${medalColors[idx]} flex items-center justify-center text-sm font-black text-black mb-3 shadow-lg`}>
                    {rank}
                  </div>

                  {/* Avatar */}
                  <div className="flex justify-center mb-2">
                    <AgentAvatar personality={agent.personality as AgentPersonality} size={42} active />
                  </div>

                  {/* Name */}
                  <h3 className={`text-sm font-bold ${personalityColor} mb-0.5`}>{agent.name}</h3>
                  <p className="text-[10px] text-gray-500 mb-2">{agent.creator}</p>

                  {/* Stats */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">ROI</span>
                      <span className="font-bold text-emerald-400">{agent.roi}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Volume</span>
                      <span className="font-semibold text-gray-300">{agent.volume}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Loves</span>
                      <span className="text-red-400 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {agent.loves.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConnectPrompt(true)}
                    className="w-full py-2 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-[11px] font-semibold text-[#B8FF3C] hover:bg-[#B8FF3C]/20 transition-all"
                  >
                    Use Agent
                  </button>
                </div>
              );
            })}
          </div>

          {/* Remaining agents - compact list */}
          <div className={`overflow-hidden transition-all duration-300 ease-out ${showAllLeague ? 'max-h-[500px]' : 'max-h-0'}`}>
            <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] overflow-hidden">
              {leaderboardAgents.slice(3).map((agent, idx) => {
                const rank = idx + 4;
                const personalityColor = agent.personality === 'apex' ? 'text-red-400' : agent.personality === 'echo' ? 'text-violet-400' : agent.personality === 'nova' ? 'text-emerald-400' : 'text-cyan-400';

                return (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-xs text-gray-600 font-mono w-5 text-center">{rank}</span>
                    <AgentAvatar personality={agent.personality as AgentPersonality} size={28} active />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${personalityColor}`}>{agent.name}</span>
                        <span className="text-[10px] text-gray-600">{agent.creator}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-emerald-400">{agent.roi}</span>
                        <span className="text-[10px] text-gray-600 ml-2">{agent.volume}</span>
                      </div>
                      <span className="text-xs text-emerald-400 font-bold sm:hidden">{agent.roi}</span>
                      <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {agent.loves.toLocaleString()}
                      </span>
                      <button
                        onClick={() => setShowConnectPrompt(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-[10px] font-semibold text-[#B8FF3C] hover:bg-[#B8FF3C]/20 transition-all"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {leaderboardAgents.length > 3 && (
            <button
              onClick={() => setShowAllLeague(!showAllLeague)}
              className="mt-3 w-full py-2 rounded-lg border border-[#1e1e2e] bg-white/[0.02] text-xs font-medium text-gray-400 hover:text-white hover:border-white/[0.1] transition-all flex items-center justify-center gap-1.5"
            >
              {showAllLeague ? 'Show Less' : `View All (${leaderboardAgents.length})`}
              <svg className={`w-3.5 h-3.5 transition-transform ${showAllLeague ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          )}
        </section>
      </div>

      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Explore Agents</h1>
            <p className="text-sm text-gray-500">
              Discover proven trading strategies built by the community and Cladex team
            </p>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents, strategies..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111118] border border-[#1e1e2e] text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-[#B8FF3C]/50 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200',
                    activeFilter === f.id
                      ? f.id === 'all'
                        ? 'bg-[#B8FF3C]/10 border-[#B8FF3C]/30 text-[#B8FF3C]'
                        : `bg-${f.id}-500/15 border-${f.id}-500/30 text-${f.id}-400`
                      : 'bg-[#111118] border-[#1e1e2e] text-gray-400 hover:text-gray-200 hover:border-[#2e2e3e]',
                  ].join(' ')}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Result count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} available
          </p>
          <div className="text-xs text-gray-600">Sorted by popularity</div>
        </div>

        {filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <Search size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No agents found</h3>
            <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onUse={() => setShowConnectPrompt(true)}
                onPreview={() => setPreviewAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewAgent}
        onClose={() => setPreviewAgent(null)}
        title={previewAgent?.name}
        size="lg"
      >
        {previewAgent && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Badge variant={previewAgent.personality} dot>
                {PERSONALITY_META[previewAgent.personality].label}
              </Badge>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${RISK_STYLES[previewAgent.riskLevel]}`}>
                {previewAgent.riskLevel} Risk
              </span>
              <span className="text-xs text-gray-500">
                by {previewAgent.creator}
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{previewAgent.description}</p>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-[#0a0a0f] rounded-xl p-2.5 sm:p-4 text-center border border-[#1e1e2e]">
                <div className="text-[10px] sm:text-xs text-gray-500 mb-1">Return</div>
                <div className="text-base sm:text-xl font-bold text-nova-400">+{previewAgent.monthlyReturn}%</div>
              </div>
              <div className="bg-[#0a0a0f] rounded-xl p-2.5 sm:p-4 text-center border border-[#1e1e2e]">
                <div className="text-[10px] sm:text-xs text-gray-500 mb-1">Win Rate</div>
                <div className="text-base sm:text-xl font-bold text-white">{previewAgent.winRate}%</div>
              </div>
              <div className="bg-[#0a0a0f] rounded-xl p-2.5 sm:p-4 text-center border border-[#1e1e2e]">
                <div className="text-[10px] sm:text-xs text-gray-500 mb-1">Trades</div>
                <div className="text-base sm:text-xl font-bold text-white">{previewAgent.totalTrades.toLocaleString()}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">Trading Assets</div>
              <div className="flex gap-2">
                {previewAgent.assets.map((a) => (
                  <span key={a} className="px-2.5 py-1 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] text-xs text-gray-300 font-medium">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Users size={14} />
                <span>{previewAgent.users.toLocaleString()} users</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-amber-400">
                <Star size={14} className="fill-amber-400" />
                <span>{previewAgent.rating}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              {previewAgent.price === 0 ? (
                <span className="text-lg font-bold text-nova-400">FREE</span>
              ) : (
                <span className="text-lg font-bold text-white">${previewAgent.price}<span className="text-sm font-normal text-gray-500">/mo</span></span>
              )}
            </div>

            <Button
              fullWidth
              onClick={() => {
                setPreviewAgent(null);
                setShowConnectPrompt(true);
              }}
              icon={<ArrowRight size={16} />}
              iconPosition="right"
            >
              {previewAgent.price === 0 ? 'Use Agent' : `Subscribe \u2014 $${previewAgent.price}/mo`}
            </Button>
          </div>
        )}
      </Modal>

      {/* Use Agent Confirmation Modal */}
      <Modal
        isOpen={!!useAgent}
        onClose={() => setUseAgent(null)}
        title="Activate Agent"
        size="md"
      >
        {useAgent && (
          <div className="space-y-4">
            <div className="bg-[#0a0a0f] rounded-xl p-4 border border-[#1e1e2e]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PERSONALITY_META[useAgent.personality].color} bg-${useAgent.personality}-500/10`}>
                  {PERSONALITY_META[useAgent.personality].icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{useAgent.name}</h3>
                  <p className="text-xs text-gray-500">{PERSONALITY_META[useAgent.personality].label} agent</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{useAgent.description}</p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              This agent will be added to your portfolio and begin monitoring the market based on its strategy. You can pause or stop it at any time from your Agents page.
            </p>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setUseAgent(null)}>
                Cancel
              </Button>
              <Button fullWidth onClick={() => setUseAgent(null)}>
                Activate Agent
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Connect Exchange Prompt */}
      {showConnectPrompt && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowConnectPrompt(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[#1e1e2e] bg-[#111118] shadow-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7L12 2L22 7L12 12L2 7Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect Exchange to Continue</h3>
              <p className="text-sm text-gray-400 mb-5">Connect your exchange to deploy and use this agent for live trading.</p>
              <div className="flex flex-col gap-2 mb-4 text-left">
                {['Your funds stay on your exchange', 'No withdrawals allowed', 'Disconnect anytime'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5 text-[#B8FF3C]/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17L4 12" /></svg>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <a
                href="/dashboard/settings"
                className="block w-full py-2.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all mb-2"
              >
                Connect Exchange
              </a>
              <button
                onClick={() => setShowConnectPrompt(false)}
                className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
