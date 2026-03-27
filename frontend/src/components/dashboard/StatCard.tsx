'use client';

import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  valueColor?: string;
  className?: string;
}

function StatCard({ icon, label, value, trend, valueColor = 'text-white', className = '' }: StatCardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-[#1e1e2e] bg-[#111118] p-5',
        'transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm font-medium">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.direction === 'up' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-guardian-400">
              <path d="M7 2.5L12 8.5H2L7 2.5Z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-hunter-400">
              <path d="M7 11.5L2 5.5H12L7 11.5Z" fill="currentColor" />
            </svg>
          )}
          <span
            className={`text-xs font-medium ${
              trend.direction === 'up' ? 'text-guardian-400' : 'text-hunter-400'
            }`}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
