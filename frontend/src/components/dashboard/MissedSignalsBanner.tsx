'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface MissedSignalsBannerProps {
  count: number;
  pnl: number;
  manualPnl?: number;
}

function MissedSignalsBanner({ count, pnl, manualPnl = 0 }: MissedSignalsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if: dismissed, no missed signals, pnl is 0, or missed pnl isn't bigger than manual results
  if (dismissed || count === 0 || pnl <= 0 || pnl <= manualPnl) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-slideDown">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="text-xs text-gray-300">
          You missed <span className="font-bold text-amber-400">{count} signal{count !== 1 ? 's' : ''}</span> worth{' '}
          <span className="font-bold text-emerald-400">+${pnl.toLocaleString()}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/pricing"
          className="text-xs font-medium text-[#B8FF3C] hover:brightness-110 transition-colors whitespace-nowrap"
        >
          Enable Auto Mode
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="w-5 h-5 rounded flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export { MissedSignalsBanner };
