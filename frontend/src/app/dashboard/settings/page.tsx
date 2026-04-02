'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const EXCHANGES = [
  { id: 'bybit', name: 'Bybit', letter: 'BY', color: '#F7A600' },
  { id: 'binance', name: 'Binance', letter: 'B', color: '#F0B90B' },
  { id: 'okx', name: 'OKX', letter: 'OK', color: '#FFFFFF' },
  { id: 'kucoin', name: 'KuCoin', letter: 'KC', color: '#23AF91' },
];

export default function SettingsPage() {
  const [connectedExchange, setConnectedExchange] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cladex_theme');
    if (saved === 'light') {
      setIsDark(false);
    }
    // Load connected exchanges from backend
    (async () => {
      try {
        const data = await api.get<{ exchanges: { id: string; name: string; connected: boolean }[] }>('/exchange');
        if (data?.exchanges?.length > 0) {
          setConnectedExchange(data.exchanges[0].name);
        }
      } catch {
        // Backend unreachable
      }
    })();
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cladex_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('cladex_theme', 'light');
    }
  };

  const handleConnect = async () => {
    if (!selectedExchange || !apiKey || !apiSecret) return;
    setConnecting(true);
    setConnectError('');
    try {
      await api.post('/exchange/connect', { name: selectedExchange, apiKey, apiSecret });
      setConnectedExchange(selectedExchange);
      setApiKey('');
      setApiSecret('');
      localStorage.setItem('cladex_exchange_connected', 'true');
      localStorage.removeItem('cladex_demo_mode');
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to connect. Check your API keys.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const data = await api.get<{ exchanges: { id: string }[] }>('/exchange');
      if (data?.exchanges?.[0]) {
        await api.delete(`/exchange/${data.exchanges[0].id}`);
      }
      setConnectedExchange(null);
      localStorage.removeItem('cladex_exchange_connected');
    } catch {
      setConnectedExchange(null);
      localStorage.removeItem('cladex_exchange_connected');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your exchange connection</p>
      </div>

      {/* Connected Exchange */}
      <section className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Exchange Connection</h2>

        {connectedExchange ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: `${EXCHANGES.find(e => e.id === connectedExchange)?.color || '#666'}20`, color: EXCHANGES.find(e => e.id === connectedExchange)?.color || '#666' }}
              >
                {EXCHANGES.find(e => e.id === connectedExchange)?.letter || connectedExchange.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">{EXCHANGES.find(e => e.id === connectedExchange)?.name || connectedExchange}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
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
                  onClick={() => { setSelectedExchange(ex.id); setConnectError(''); }}
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

            {connectError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <span className="text-xs text-red-400">{connectError}</span>
              </div>
            )}

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
                  {connecting ? (<><svg className="w-4 h-4 animate-spin inline mr-1.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>Validating keys...</>) : 'Connect Exchange'}
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

      {/* Appearance */}
      <section className="rounded-2xl border border-[#1e1e2e] bg-[#111118] p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Appearance</h2>
        <p className="text-xs text-gray-500 mb-4">Switch between dark and light mode</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
            <span className="text-sm text-gray-300">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isDark ? 'bg-[#1e1e2e]' : 'bg-[#B8FF3C]'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isDark ? 'translate-x-0' : 'translate-x-6'}`}
            />
          </button>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-600 text-center">
        For demonstration purposes only. Past performance does not guarantee future results. Trading involves risk.
      </p>
    </div>
  );
}
