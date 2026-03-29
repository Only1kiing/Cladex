'use client';

import { useState } from 'react';
import Link from 'next/link';

const EXCHANGES = [
  { id: 'bybit', name: 'Bybit', letter: 'BY', color: '#F7A600' },
  { id: 'binance', name: 'Binance', letter: 'B', color: '#F0B90B' },
  { id: 'mask', name: 'Mask', letter: 'M', color: '#1C8CF0' },
  { id: 'polymarket', name: 'Polymarket', letter: 'PM', color: '#00D395' },
];

export default function SettingsPage() {
  const [balance, setBalance] = useState(250.00);
  const [depositAmount, setDepositAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [connectedExchange, setConnectedExchange] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    setDepositing(true);
    setTimeout(() => {
      setBalance(prev => prev + amount);
      setDepositAmount('');
      setShowDeposit(false);
      setDepositing(false);
    }, 1500);
  };

  const handleConnect = () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;
    setConnecting(true);
    setTimeout(() => {
      setConnectedExchange(selectedExchange);
      setConnecting(false);
      setApiKey('');
      setApiSecret('');
    }, 2000);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your exchange connection and balance</p>
      </div>

      {/* Connected Exchange */}
      <section className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Connected Exchange</h2>

        {connectedExchange ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: `${EXCHANGES.find(e => e.id === connectedExchange)?.color}20`, color: EXCHANGES.find(e => e.id === connectedExchange)?.color }}
              >
                {EXCHANGES.find(e => e.id === connectedExchange)?.letter}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">{EXCHANGES.find(e => e.id === connectedExchange)?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setConnectedExchange(null)}
              className="px-4 py-2 rounded-lg border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-4">Connect your exchange to enable live trading</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {EXCHANGES.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExchange(ex.id)}
                  className={`rounded-lg border-2 p-3 flex items-center gap-2 transition-all duration-200 ${
                    selectedExchange === ex.id
                      ? 'border-[#B8FF3C]/60 bg-[#B8FF3C]/10'
                      : 'border-[#1e1e2e] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold"
                    style={{ backgroundColor: `${ex.color}20`, color: ex.color }}
                  >
                    {ex.letter}
                  </div>
                  <span className={`text-sm font-medium ${selectedExchange === ex.id ? 'text-gray-100' : 'text-gray-400'}`}>{ex.name}</span>
                </button>
              ))}
            </div>
            {selectedExchange && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">API Key</label>
                  <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">API Secret</label>
                  <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Paste your API secret" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 transition-all" />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!apiKey || !apiSecret || connecting}
                  className="w-full py-2.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {connecting ? 'Connecting...' : 'Connect Exchange'}
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Funds stay on exchange
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                No withdrawals
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Deposit & Balance */}
      <section className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Balance</h2>
        <p className="text-xs text-gray-500 mb-4">Used for trading fees and agent deployment. No withdrawals.</p>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-3xl font-black text-white">${balance.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Available for fees & minting</p>
          </div>
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className="px-5 py-2.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all"
          >
            Deposit
          </button>
        </div>

        {showDeposit && (
          <div className="rounded-xl border border-[#B8FF3C]/20 bg-[#B8FF3C]/[0.03] p-4 mb-4">
            <label className="text-xs text-gray-400 font-medium mb-2 block">Deposit Amount (USDT)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 transition-all"
              />
              <button
                onClick={handleDeposit}
                disabled={depositing || !depositAmount || parseFloat(depositAmount) <= 0}
                className="px-5 py-2.5 rounded-lg bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {depositing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[10, 25, 50, 100].map((amt) => (
                <button key={amt} onClick={() => setDepositAmount(String(amt))} className="px-3 py-1 rounded-lg border border-[#1e1e2e] text-xs text-gray-400 hover:border-[#B8FF3C]/30 hover:text-[#B8FF3C] transition-colors">
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Transactions</h3>
          <div className="space-y-2">
            {[
              { type: 'Deposit', amount: '+$100.00', date: '2 days ago', color: 'text-emerald-400' },
              { type: 'Trading Fee', amount: '-$2.40', date: '2 days ago', color: 'text-red-400' },
              { type: 'Deposit', amount: '+$150.00', date: '5 days ago', color: 'text-emerald-400' },
              { type: 'Agent Minting', amount: '-$25.00', date: '5 days ago', color: 'text-red-400' },
              { type: 'Trading Fee', amount: '-$1.80', date: '1 week ago', color: 'text-red-400' },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03]">
                <div>
                  <p className="text-sm text-gray-300">{tx.type}</p>
                  <p className="text-xs text-gray-600">{tx.date}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.color}`}>{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            Balance is used for trading fees and agent deployment costs only. Withdrawals are not supported — your trading funds stay on your connected exchange.
          </p>
        </div>
      </section>

      {/* Payment Preferences */}
      <section className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Payment Preferences</h2>
        <p className="text-xs text-gray-500 mb-4">Choose how to pay for deployment and trading fees</p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 rounded-xl border border-[#B8FF3C]/30 bg-[#B8FF3C]/[0.03] cursor-pointer">
            <input type="radio" name="payment" defaultChecked className="accent-[#B8FF3C]" />
            <div>
              <p className="text-sm font-medium text-gray-200">Pay from Balance</p>
              <p className="text-xs text-gray-500">Deduct fees and minting costs from your Cladex balance</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 rounded-xl border border-[#1e1e2e] hover:border-white/[0.1] cursor-pointer transition-colors">
            <input type="radio" name="payment" className="accent-[#B8FF3C]" />
            <div>
              <p className="text-sm font-medium text-gray-200">Connect Wallet</p>
              <p className="text-xs text-gray-500">Pay directly from your connected wallet (MetaMask, etc.)</p>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
