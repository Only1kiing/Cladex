'use client';

import React from 'react';

type ActivityType = 'trade' | 'signal' | 'alert' | 'system' | 'error';

interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  tradeDirection?: 'buy' | 'sell';
  agentPersonality?: 'nova' | 'sage' | 'apex' | 'echo';
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

function TradeIcon({ direction }: { direction?: 'buy' | 'sell' }) {
  const color = direction === 'sell' ? '#f87171' : '#4ade80';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3v10M8 3L4.5 6.5M8 3l3.5 3.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={direction === 'sell' ? 'rotate(180 8 8)' : ''}
      />
    </svg>
  );
}

function InsightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5a4 4 0 012.5 7.13V10a1 1 0 01-1 1h-3a1 1 0 01-1-1V8.63A4 4 0 018 1.5zM6 12.5h4M7 14h2"
        stroke="#60a5fa"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5L14.5 13H1.5L8 1.5z"
        stroke="#fbbf24"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v2.5M8 11.5h.005" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="#a855f7" strokeWidth="1.2" />
      <path d="M8 5.5v3l2 1" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="#f87171" strokeWidth="1.2" />
      <path d="M10 6l-4 4M6 6l4 4" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const iconBgColors: Record<ActivityType, string> = {
  trade: 'bg-nova-500/10',
  signal: 'bg-sage-500/10',
  alert: 'bg-amber-500/10',
  system: 'bg-echo-500/10',
  error: 'bg-apex-500/10',
};

function getIcon(type: ActivityType, direction?: 'buy' | 'sell') {
  switch (type) {
    case 'trade':
      return <TradeIcon direction={direction} />;
    case 'signal':
      return <InsightIcon />;
    case 'alert':
      return <AlertIcon />;
    case 'system':
      return <SystemIcon />;
    case 'error':
      return <ErrorIcon />;
  }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ActivityFeed({ items, className = '' }: ActivityFeedProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors duration-150"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBgColors[item.type]}`}
          >
            {getIcon(item.type, item.tradeDirection)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 leading-relaxed">{item.message}</p>
          </div>
          <span className="text-[11px] text-gray-500 shrink-0 mt-0.5">{formatTimestamp(item.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

export { ActivityFeed };
export type { ActivityFeedProps, ActivityItem, ActivityType };
