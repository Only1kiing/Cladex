'use client';

import React from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  manualTrades: number;
  missedSignals: number;
  missedPnl: number;
}

function UpgradePrompt({ isOpen, onClose, manualTrades, missedSignals, missedPnl }: UpgradePromptProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center space-y-5">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8FF3C]/20 to-emerald-500/10 border border-[#B8FF3C]/30 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            You&apos;re trading manually.
          </h3>
          <p className="text-sm text-gray-400">
            Your agents could do this 24/7 — even while you sleep.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-2xl font-black text-white">{manualTrades}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Manual Trades</p>
          </div>
          <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/15 p-3 text-center">
            <p className="text-2xl font-black text-amber-400">{missedSignals}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Signals Missed</p>
          </div>
          <div className="rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">${missedPnl.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Missed Profit</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          With auto mode, your agents execute trades instantly — no missed signals, no screen time required. Upgrade to let them work for you around the clock.
        </p>

        {/* CTAs */}
        <div className="space-y-2.5 pt-1">
          <Link
            href="/pricing"
            className="block w-full py-3.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm text-center hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#B8FF3C]/20"
          >
            Upgrade to Auto Mode
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { UpgradePrompt };
