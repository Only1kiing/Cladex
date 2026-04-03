'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  DollarSign,
  PieChart,
  TrendingDown,
  Activity,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';

// ---- Types ----

interface RiskConfig {
  maxRiskPerTrade: number;
  maxExposure: number;
  dailyLossLimit: number;
  maxDrawdown: number;
}

interface RiskStatusData {
  riskLocked: boolean;
  riskLockedAt: string | null;
  riskLockedReason: string | null;
}

interface PortfolioData {
  totalBalance: number;
  openExposure: number;
  dailyPnl: number;
  peakBalance: number;
  currentDrawdown: number;
}

interface AgentCooldown {
  id: string;
  name: string;
  cooldownUntil: string;
  consecutiveLosses: number;
  status: string;
}

interface RiskStatusResponse {
  config: RiskConfig;
  status: RiskStatusData;
  portfolio: PortfolioData;
  agentCooldowns: AgentCooldown[];
}

// ---- Helpers ----

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exposureColor(exposureRatio: number): string {
  if (exposureRatio > 0.8) return 'text-red-400';
  if (exposureRatio > 0.5) return 'text-amber-400';
  return 'text-emerald-400';
}

function exposureBgColor(exposureRatio: number): string {
  if (exposureRatio > 0.8) return 'bg-red-400/10';
  if (exposureRatio > 0.5) return 'bg-amber-400/10';
  return 'bg-emerald-400/10';
}

function drawdownColor(drawdown: number): string {
  const abs = Math.abs(drawdown);
  if (abs > 0.15) return 'text-red-400';
  if (abs > 0.08) return 'text-amber-400';
  return 'text-emerald-400';
}

function pnlColor(value: number): string {
  return value >= 0 ? 'text-emerald-400' : 'text-red-400';
}

// ---- Slider Component ----

interface RiskSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  negative?: boolean;
}

function RiskSlider({ label, value, min, max, step, format, onChange, negative }: RiskSliderProps) {
  const displayValue = negative ? value * 100 : value * 100;
  const displayMin = negative ? min * 100 : min * 100;
  const displayMax = negative ? max * 100 : max * 100;
  const displayStep = step * 100;

  const progress = ((displayValue - displayMin) / (displayMax - displayMin)) * 100;
  const barColor = negative
    ? `hsl(${Math.max(0, 120 - progress * 1.2)}, 70%, 50%)`
    : `hsl(${Math.max(0, 120 - progress * 1.2)}, 70%, 50%)`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-mono font-semibold text-white">
          {format(value)}
        </span>
      </div>
      <div className="relative">
        <div className="w-full h-2 rounded-full bg-white/5">
          <div
            className="h-2 rounded-full transition-all duration-200"
            style={{ width: `${progress}%`, backgroundColor: barColor }}
          />
        </div>
        <input
          type="range"
          min={displayMin}
          max={displayMax}
          step={displayStep}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ---- Risk Meter Component ----

interface RiskMeterProps {
  currentDrawdown: number;
  maxDrawdown: number;
}

function RiskMeter({ currentDrawdown, maxDrawdown }: RiskMeterProps) {
  const ratio = Math.min(Math.abs(currentDrawdown) / Math.abs(maxDrawdown), 1);
  const percentage = ratio * 100;

  let barColor = 'bg-emerald-400';
  let glowColor = 'shadow-emerald-400/30';
  let statusLabel = 'Low Risk';
  if (ratio > 0.8) {
    barColor = 'bg-red-400';
    glowColor = 'shadow-red-400/30';
    statusLabel = 'Critical';
  } else if (ratio > 0.5) {
    barColor = 'bg-amber-400';
    glowColor = 'shadow-amber-400/30';
    statusLabel = 'Elevated';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Risk Meter</span>
        </div>
        <span className={`text-sm font-semibold ${ratio > 0.8 ? 'text-red-400' : ratio > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {statusLabel}
        </span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="w-full h-5 rounded-full bg-white/5 border border-white/[0.06] overflow-hidden">
          {/* Fill */}
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} shadow-lg ${glowColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Markers */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="absolute left-[50%] w-px h-5 bg-white/10" />
          <div className="absolute left-[80%] w-px h-5 bg-white/10" />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span>Current: {formatPercent(Math.abs(currentDrawdown))}</span>
        <span>Limit: {formatPercent(Math.abs(maxDrawdown))}</span>
      </div>
    </div>
  );
}

// ---- Toast Component ----

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium shadow-lg shadow-emerald-500/10 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <CheckCircle size={16} />
      {message}
    </div>
  );
}

// ---- Main Page ----

export default function RiskDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [config, setConfig] = useState<RiskConfig>({
    maxRiskPerTrade: 0.02,
    maxExposure: 0.2,
    dailyLossLimit: -0.08,
    maxDrawdown: -0.2,
  });
  const [editConfig, setEditConfig] = useState<RiskConfig>({ ...config });
  const [status, setStatus] = useState<RiskStatusData>({
    riskLocked: false,
    riskLockedAt: null,
    riskLockedReason: null,
  });
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    totalBalance: 0,
    openExposure: 0,
    dailyPnl: 0,
    peakBalance: 0,
    currentDrawdown: 0,
  });
  const [agentCooldowns, setAgentCooldowns] = useState<AgentCooldown[]>([]);

  const fetchRiskStatus = useCallback(async () => {
    try {
      const data = await api.get<RiskStatusResponse>('/risk/status');
      setConfig(data.config);
      setEditConfig(data.config);
      setStatus(data.status);
      setPortfolio(data.portfolio);
      setAgentCooldowns(data.agentCooldowns);
      setError(null);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to load risk data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskStatus();
  }, [fetchRiskStatus]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/risk/config', {
        maxRiskPerTrade: editConfig.maxRiskPerTrade,
        maxExposure: editConfig.maxExposure,
        dailyLossLimit: editConfig.dailyLossLimit,
        maxDrawdown: editConfig.maxDrawdown,
      });
      setConfig({ ...editConfig });
      showToast('Risk settings saved successfully');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to save risk settings';
      showToast(message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    editConfig.maxRiskPerTrade !== config.maxRiskPerTrade ||
    editConfig.maxExposure !== config.maxExposure ||
    editConfig.dailyLossLimit !== config.dailyLossLimit ||
    editConfig.maxDrawdown !== config.maxDrawdown;

  const exposurePercent = portfolio.totalBalance > 0
    ? portfolio.openExposure / portfolio.totalBalance
    : 0;
  const exposureRatio = config.maxExposure > 0
    ? exposurePercent / config.maxExposure
    : 0;
  const dailyPnlPercent = portfolio.totalBalance > 0
    ? portfolio.dailyPnl / portfolio.totalBalance
    : 0;

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-[#B8FF3C]" />
          <span className="text-gray-400 text-sm">Loading risk data...</span>
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (error && !portfolio.totalBalance) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <Button onClick={fetchRiskStatus}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#B8FF3C]/10">
            <ShieldAlert size={24} className="text-[#B8FF3C]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Risk Management</h1>
            <p className="text-sm text-gray-400">Monitor and configure portfolio risk controls</p>
          </div>
        </div>

        {/* Risk Locked Banner */}
        {status.riskLocked && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <Lock size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-red-400 font-semibold text-sm">
                Account Locked: {status.riskLockedReason || 'Risk limit exceeded'}
              </p>
              {status.riskLockedAt && (
                <p className="text-red-400/60 text-xs mt-0.5">
                  Locked at {formatDateTime(status.riskLockedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Health Stats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Portfolio Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Balance */}
            <Card className="bg-[#111118] border-[#1e1e2e]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#B8FF3C]/10">
                  <DollarSign size={16} className="text-[#B8FF3C]" />
                </div>
                <span className="text-sm text-gray-400">Total Balance</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(portfolio.totalBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Peak: {formatCurrency(portfolio.peakBalance)}
              </p>
            </Card>

            {/* Open Exposure */}
            <Card className="bg-[#111118] border-[#1e1e2e]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${exposureBgColor(exposureRatio)}`}>
                  <PieChart size={16} className={exposureColor(exposureRatio)} />
                </div>
                <span className="text-sm text-gray-400">Open Exposure</span>
              </div>
              <p className={`text-2xl font-bold ${exposureColor(exposureRatio)}`}>
                {formatCurrency(portfolio.openExposure)}
              </p>
              <p className={`text-xs mt-1 ${exposureColor(exposureRatio)}`}>
                {formatPercent(exposurePercent)} of balance
                {' '}
                <span className="text-gray-500">
                  (limit: {formatPercent(config.maxExposure)})
                </span>
              </p>
            </Card>

            {/* Daily P&L */}
            <Card className="bg-[#111118] border-[#1e1e2e]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${portfolio.dailyPnl >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
                  <TrendingDown
                    size={16}
                    className={pnlColor(portfolio.dailyPnl)}
                    style={{ transform: portfolio.dailyPnl >= 0 ? 'scaleY(-1)' : 'none' }}
                  />
                </div>
                <span className="text-sm text-gray-400">Daily P&L</span>
              </div>
              <p className={`text-2xl font-bold ${pnlColor(portfolio.dailyPnl)}`}>
                {portfolio.dailyPnl >= 0 ? '+' : ''}{formatCurrency(portfolio.dailyPnl)}
              </p>
              <p className={`text-xs mt-1 ${pnlColor(portfolio.dailyPnl)}`}>
                {portfolio.dailyPnl >= 0 ? '+' : ''}{formatPercent(dailyPnlPercent)}
                {' '}
                <span className="text-gray-500">
                  (limit: {formatPercent(Math.abs(config.dailyLossLimit))})
                </span>
              </p>
            </Card>

            {/* Current Drawdown */}
            <Card className="bg-[#111118] border-[#1e1e2e]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${Math.abs(portfolio.currentDrawdown) > 0.15 ? 'bg-red-400/10' : Math.abs(portfolio.currentDrawdown) > 0.08 ? 'bg-amber-400/10' : 'bg-emerald-400/10'}`}>
                  <Activity size={16} className={drawdownColor(portfolio.currentDrawdown)} />
                </div>
                <span className="text-sm text-gray-400">Current Drawdown</span>
              </div>
              <p className={`text-2xl font-bold ${drawdownColor(portfolio.currentDrawdown)}`}>
                {formatPercent(Math.abs(portfolio.currentDrawdown))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                from peak of {formatCurrency(portfolio.peakBalance)}
              </p>
            </Card>
          </div>
        </div>

        {/* Risk Meter */}
        <Card className="bg-[#111118] border-[#1e1e2e]">
          <RiskMeter
            currentDrawdown={portfolio.currentDrawdown}
            maxDrawdown={config.maxDrawdown}
          />
        </Card>

        {/* Risk Configuration */}
        <Card className="bg-[#111118] border-[#1e1e2e]">
          <CardHeader
            title="Risk Configuration"
            subtitle="Adjust your risk parameters to control trading behavior"
            action={
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
                size="sm"
                icon={<Save size={14} />}
              >
                Save Changes
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RiskSlider
              label="Max Risk Per Trade"
              value={editConfig.maxRiskPerTrade}
              min={0.005}
              max={0.10}
              step={0.005}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              onChange={(v) => setEditConfig((prev) => ({ ...prev, maxRiskPerTrade: v }))}
            />

            <RiskSlider
              label="Max Exposure"
              value={editConfig.maxExposure}
              min={0.05}
              max={0.50}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => setEditConfig((prev) => ({ ...prev, maxExposure: v }))}
            />

            <RiskSlider
              label="Daily Loss Limit"
              value={editConfig.dailyLossLimit}
              min={-0.20}
              max={-0.02}
              step={0.01}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => setEditConfig((prev) => ({ ...prev, dailyLossLimit: v }))}
              negative
            />

            <RiskSlider
              label="Max Drawdown"
              value={editConfig.maxDrawdown}
              min={-0.50}
              max={-0.05}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => setEditConfig((prev) => ({ ...prev, maxDrawdown: v }))}
              negative
            />
          </div>
        </Card>

        {/* Agent Cooldowns */}
        <Card className="bg-[#111118] border-[#1e1e2e]">
          <CardHeader
            title="Agent Cooldowns"
            subtitle="Agents currently paused due to consecutive losses"
          />

          {agentCooldowns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={32} className="text-emerald-400/40 mb-3" />
              <p className="text-gray-400 text-sm">No agents in cooldown</p>
              <p className="text-gray-500 text-xs mt-1">All agents are operating normally</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Agent</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Consecutive Losses</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Cooldown Until</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agentCooldowns.map((agent) => (
                    <tr
                      key={agent.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-gray-100 font-medium">{agent.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-red-400 font-mono">{agent.consecutiveLosses}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Clock size={14} className="text-gray-500" />
                          {formatDateTime(agent.cooldownUntil)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {agent.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Toast */}
      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  );
}
