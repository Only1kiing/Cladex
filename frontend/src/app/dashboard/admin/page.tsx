'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types';

// ---- Types ----

interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalTrades: number;
  totalVolume: number;
  admins: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

interface AdminSignal {
  id: string;
  symbol: string;
  side: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reason: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  agent?: { id: string; name: string; personality: string } | null;
}

type TabKey = 'users' | 'signals' | 'generate';

// ---- Utilities ----

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ---- Page ----

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [signals, setSignals] = useState<AdminSignal[]>([]);

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    const role = user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      router.replace('/dashboard');
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [authLoading, user, router]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await api.get<AdminStats>('/admin/stats');
      setStats(data);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get<{ users: AdminUser[] }>('/admin/users');
      setUsers(data.users);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadSignals = useCallback(async () => {
    setLoadingSignals(true);
    try {
      const data = await api.get<{ signals: AdminSignal[] }>('/admin/signals');
      setSignals(data.signals);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to load signals');
    } finally {
      setLoadingSignals(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadStats();
    loadUsers();
    loadSignals();
  }, [authorized, loadStats, loadUsers, loadSignals]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setError(null);
    setMessage(null);
    try {
      await api.post(`/admin/users/${userId}/role`, { role: newRole });
      setMessage('Role updated');
      await loadUsers();
      await loadStats();
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to change role');
    }
  };

  const handleExpireSignal = async (signalId: string) => {
    setError(null);
    setMessage(null);
    try {
      await api.post(`/admin/signals/${signalId}/expire`);
      setMessage('Signal expired');
      await loadSignals();
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to expire signal');
    }
  };

  const handleGenerateSignal = async () => {
    setError(null);
    setMessage(null);
    setGenerating(true);
    try {
      const data = await api.post<{ generated: number }>('/admin/generate-signal');
      setMessage(`Generated ${data.generated} signal${data.generated === 1 ? '' : 's'}`);
      await loadSignals();
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to generate signal');
    } finally {
      setGenerating(false);
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'users' as const, label: 'Users' },
      { key: 'signals' as const, label: 'Signals' },
      { key: 'generate' as const, label: 'Force Generate Signal' },
    ],
    []
  );

  if (authLoading || authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#B8FF3C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-full bg-[#0a0a0f] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin</h1>
            <p className="text-sm text-gray-400 mt-1">
              Platform administration{isSuperAdmin ? ' (super admin)' : ''}
            </p>
          </div>
        </header>

        {(error || message) && (
          <div
            className={[
              'rounded-lg px-4 py-3 text-sm border',
              error
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-[#B8FF3C]/10 border-[#B8FF3C]/30 text-[#B8FF3C]',
            ].join(' ')}
          >
            {error || message}
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Users" value={stats ? formatNumber(stats.totalUsers) : '—'} loading={loadingStats} />
          <StatCard label="Agents" value={stats ? formatNumber(stats.totalAgents) : '—'} loading={loadingStats} />
          <StatCard label="Trades" value={stats ? formatNumber(stats.totalTrades) : '—'} loading={loadingStats} />
          <StatCard label="Volume" value={stats ? formatUsd(stats.totalVolume) : '—'} loading={loadingStats} />
        </section>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === t.key
                  ? 'bg-[#B8FF3C] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        {activeTab === 'users' && (
          <section className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white">All Users ({users.length})</h2>
              <button
                onClick={loadUsers}
                className="text-xs text-gray-400 hover:text-white transition-colors"
                disabled={loadingUsers}
              >
                {loadingUsers ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/[0.06]">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Verified</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-200">{u.email}</td>
                      <td className="px-4 py-3 text-gray-300">{u.name}</td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="bg-[#0a0a0f] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#B8FF3C]"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'text-xs px-2 py-0.5 rounded-full border',
                            u.emailVerified
                              ? 'bg-[#B8FF3C]/10 border-[#B8FF3C]/30 text-[#B8FF3C]'
                              : 'bg-white/[0.04] border-white/[0.08] text-gray-400',
                          ].join(' ')}
                        >
                          {u.emailVerified ? 'yes' : 'no'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && !loadingUsers && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'signals' && (
          <section className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white">Recent Signals ({signals.length})</h2>
              <button
                onClick={loadSignals}
                className="text-xs text-gray-400 hover:text-white transition-colors"
                disabled={loadingSignals}
              >
                {loadingSignals ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {signals.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-4 hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{s.symbol}</span>
                      <span
                        className={[
                          'text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold',
                          s.side.toLowerCase() === 'long' || s.side.toLowerCase() === 'buy'
                            ? 'bg-[#B8FF3C]/10 text-[#B8FF3C]'
                            : 'bg-red-500/10 text-red-400',
                        ].join(' ')}
                      >
                        {s.side}
                      </span>
                      <span
                        className={[
                          'text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold border',
                          s.status === 'active'
                            ? 'bg-[#B8FF3C]/10 border-[#B8FF3C]/30 text-[#B8FF3C]'
                            : 'bg-white/[0.04] border-white/[0.08] text-gray-400',
                        ].join(' ')}
                      >
                        {s.status}
                      </span>
                      {s.agent && (
                        <span className="text-[11px] text-gray-500">by {s.agent.name}</span>
                      )}
                      <span className="text-[11px] text-gray-500">conf {s.confidence}%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 truncate">{s.reason}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      entry {s.entryPrice} · SL {s.stopLoss} · TP {s.takeProfit} · created {formatDate(s.createdAt)}
                    </div>
                  </div>
                  {s.status === 'active' && (
                    <button
                      onClick={() => handleExpireSignal(s.id)}
                      className="shrink-0 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      Expire
                    </button>
                  )}
                </div>
              ))}
              {signals.length === 0 && !loadingSignals && (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">No signals</div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'generate' && (
          <section className="bg-[#111118] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-2">Force Generate Signal</h2>
            <p className="text-sm text-gray-400 mb-4">
              Expires stale signals and triggers the signal generation service for all team agents.
            </p>
            <button
              onClick={handleGenerateSignal}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-[#B8FF3C] text-black text-sm font-semibold hover:bg-[#a3e933] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? 'Generating…' : 'Generate Signal'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="bg-[#111118] border border-white/[0.06] rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-white mt-1">
        {loading ? <span className="text-gray-600">…</span> : value}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    user: 'bg-white/[0.04] border-white/[0.08] text-gray-400',
    admin: 'bg-[#B8FF3C]/10 border-[#B8FF3C]/30 text-[#B8FF3C]',
    super_admin: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  };
  return (
    <span
      className={['text-[10px] px-2 py-0.5 rounded-full border font-medium', styles[role] || styles.user].join(' ')}
    >
      {role}
    </span>
  );
}
