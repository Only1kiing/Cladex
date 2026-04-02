'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { addDeployedAgent } from '@/lib/agents-store';
import { api } from '@/lib/api';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { AgentPersonality } from '@/types';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: { name: string; price: number; agents: number } | null;
}

const WALLETS = [
  { id: 'phantom', name: 'Phantom', color: '#AB9FF2', icon: 'P', chain: 'Solana' },
  { id: 'metamask', name: 'MetaMask', color: '#F6851B', icon: 'M', chain: 'Ethereum' },
  { id: 'walletconnect', name: 'WalletConnect', color: '#3B99FC', icon: 'W', chain: 'Multi-chain' },
];

const SOLANA_ADDRESS = 'Pz1eoDHDQhH8Tb5buYDPSWSRP1ydxvDyqWhdJYxEznU';
const GAS_BALANCE_KEY = 'cladex_gas_balance';
const PENDING_DEPOSITS_KEY = 'cladex_pending_deposits';
const PENDING_DEPLOYMENTS_KEY = 'cladex_pending_deployments';
const CONNECTED_WALLET_KEY = 'cladex_connected_wallet';

function getGasBalance(): number {
  if (typeof window === 'undefined') return 0;
  return parseFloat(localStorage.getItem(GAS_BALANCE_KEY) || '0');
}

function getPendingDeposits(): { id: string; amount: number; timestamp: number; status: 'pending' | 'approved' | 'rejected' }[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(PENDING_DEPOSITS_KEY) || '[]'); } catch { return []; }
}

function addPendingDeposit(amount: number) {
  const deposits = getPendingDeposits();
  deposits.unshift({ id: `dep-${Date.now()}`, amount, timestamp: Date.now(), status: 'pending' });
  localStorage.setItem(PENDING_DEPOSITS_KEY, JSON.stringify(deposits));
}

function addPendingDeployment(plan: string, method: string, walletId?: string) {
  if (typeof window === 'undefined') return;
  const deployments = JSON.parse(localStorage.getItem(PENDING_DEPLOYMENTS_KEY) || '[]');
  deployments.unshift({
    id: `deploy-${Date.now()}`,
    plan,
    method,
    walletId,
    timestamp: Date.now(),
    status: 'pending',
  });
  localStorage.setItem(PENDING_DEPLOYMENTS_KEY, JSON.stringify(deployments));
}

function getConnectedWallet(): { id: string; name: string; address: string } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(CONNECTED_WALLET_KEY) || 'null'); } catch { return null; }
}

function DeploymentModal({ isOpen, onClose, plan }: DeploymentModalProps) {
  const router = useRouter();
  const [stage, setStage] = useState<'choose' | 'wallet-connect' | 'wallet-confirm' | 'gas-balance' | 'deposit' | 'deploying' | 'pending'>('choose');
  const [connectedWallet, setConnectedWallet] = useState<{ id: string; name: string; address: string } | null>(null);
  const [gasBalance, setGasBalance] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitted, setDepositSubmitted] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [txStatus, setTxStatus] = useState<string>('');
  const [txError, setTxError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStage('choose');
      setConnectedWallet(getConnectedWallet());
      setGasBalance(getGasBalance());
      setConnecting(false);
      setSelectedWallet(null);
      setCopied(false);
      setDepositAmount('');
      setDepositSubmitted(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      setTxStatus('');
      setTxError('');
      // Fetch SOL price
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        .then(r => r.json())
        .then(d => { if (d?.solana?.usd) setSolPrice(d.solana.usd); })
        .catch(() => setSolPrice(140)); // fallback
    }
  }, [isOpen]);

  if (!plan) return null;

  const handleWalletConnect = async (walletId: string) => {
    setSelectedWallet(walletId);
    setConnecting(true);

    try {
      let address = '';
      const wallet = WALLETS.find(w => w.id === walletId)!;

      if (walletId === 'phantom') {
        const phantom = (window as any)?.solana;
        if (!phantom?.isPhantom) {
          window.open('https://phantom.app/', '_blank');
          setConnecting(false);
          return;
        }
        const resp = await phantom.connect();
        address = resp.publicKey.toString();
      } else if (walletId === 'metamask') {
        const ethereum = (window as any)?.ethereum;
        if (!ethereum) {
          window.open('https://metamask.io/', '_blank');
          setConnecting(false);
          return;
        }
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0] as string;
      } else if (walletId === 'walletconnect') {
        // WalletConnect needs a separate SDK — for now try MetaMask fallback
        const ethereum = (window as any)?.ethereum;
        if (!ethereum) {
          window.open('https://walletconnect.com/', '_blank');
          setConnecting(false);
          return;
        }
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0] as string;
      }

      const truncated = address.length > 10
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address;

      const connected = { id: walletId, name: wallet.name, address: truncated, fullAddress: address };
      localStorage.setItem(CONNECTED_WALLET_KEY, JSON.stringify(connected));
      setConnectedWallet(connected);
      setConnecting(false);
      setStage('wallet-confirm');
    } catch (err: any) {
      setConnecting(false);
      // User rejected or wallet error — stay on wallet selection
    }
  };

  const AGENT_NAMES: Record<string, string[]> = {
    Trader: ['Sentinel', 'Viper'],
    Builder: ['Aegis', 'Phantom', 'Striker', 'Nova', 'Cipher'],
    'Pro Creator': ['Titan', 'Apex', 'Shadow', 'Oracle', 'Blitz', 'Nexus', 'Rogue', 'Zenith', 'Pulse', 'Storm'],
  };
  const PERSONALITIES: AgentPersonality[] = ['nova', 'apex', 'sage', 'echo'];
  const ASSET_SETS = [['BTC', 'ETH'], ['SOL', 'AVAX'], ['BTC', 'ETH', 'SOL'], ['LINK', 'ARB', 'ETH']];

  const createAgentsForPlan = (method: 'wallet' | 'gas-balance') => {
    const names = AGENT_NAMES[plan.name] || ['Agent'];
    const count = Math.min(names.length, plan.agents);
    for (let i = 0; i < count; i++) {
      addDeployedAgent({
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: names[i],
        personality: PERSONALITIES[i % PERSONALITIES.length],
        status: 'pending',
        plan: plan.name,
        walletAddress: method === 'wallet' ? connectedWallet?.address || null : null,
        deployMethod: method,
        pnl: 0,
        pnlPercent: 0,
        totalTrades: 0,
        winRate: 0,
        assets: ASSET_SETS[i % ASSET_SETS.length],
        createdAt: Date.now(),
      });
    }
  };

  const solAmount = solPrice > 0 ? Math.ceil((plan.price / solPrice) * 10000) / 10000 : 0;

  const handleWalletDeploy = async () => {
    setTxError('');
    setTxStatus('Requesting approval...');
    setStage('deploying');

    try {
      const phantom = (window as any)?.solana;
      if (!phantom?.isPhantom) {
        setTxError('Phantom wallet not found');
        setStage('wallet-confirm');
        return;
      }

      // Ensure connected
      await phantom.connect();

      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const fromPubkey = phantom.publicKey;
      const toPubkey = new PublicKey(SOLANA_ADDRESS);
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      setTxStatus('Creating transaction...');

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      transaction.feePayer = fromPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      setTxStatus('Approve in Phantom...');

      const signed = await phantom.signTransaction(transaction);
      setTxStatus('Sending transaction...');

      const signature = await connection.sendRawTransaction(signed.serialize());
      setTxStatus('Confirming on-chain...');

      await connection.confirmTransaction(signature, 'confirmed');
      setTxStatus('Payment confirmed!');

      // Save receipt to backend
      try {
        await api.post('/payments/receipt', {
          plan: plan.name,
          amount: plan.price.toString(),
          receiptData: `solana:${signature}`,
          fileName: `tx_${signature.slice(0, 8)}.sol`,
        });
      } catch { /* non-blocking */ }

      addPendingDeployment(plan.name, 'wallet', connectedWallet?.id);
      createAgentsForPlan('wallet');

      setTimeout(() => setStage('pending'), 1500);
    } catch (err: any) {
      const msg = err?.message || 'Transaction failed';
      if (msg.includes('User rejected')) {
        setTxError('Transaction cancelled');
      } else if (msg.includes('insufficient')) {
        setTxError('Insufficient SOL balance');
      } else {
        setTxError(msg);
      }
      setTxStatus('');
      setStage('wallet-confirm');
    }
  };

  const handleGasBalanceDeploy = () => {
    if (gasBalance < plan.price) {
      setStage('deposit');
      return;
    }
    const newBalance = gasBalance - plan.price;
    localStorage.setItem(GAS_BALANCE_KEY, newBalance.toString());
    setGasBalance(newBalance);
    setStage('deploying');
    addPendingDeployment(plan.name, 'gas-balance');
    createAgentsForPlan('gas-balance');
    setTimeout(() => setStage('pending'), 2500);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(SOLANA_ADDRESS).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    addPendingDeposit(amount);
    try {
      await api.post('/payments/receipt', {
        plan: plan.name,
        amount: depositAmount,
        receiptData: receiptPreview,
        fileName: receiptFile?.name,
      });
    } catch {
      // Don't block the UI if the API call fails
    }
    setDepositSubmitted(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Stage: Choose payment method */}
      {stage === 'choose' && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Deploy {plan.name} Plan</h3>
            <p className="text-sm text-gray-400">${plan.price} &middot; {plan.agents} agents</p>
          </div>

          <div className="space-y-2.5">
            {/* Connect Wallet option */}
            <button
              onClick={() => connectedWallet ? setStage('wallet-confirm') : setStage('wallet-connect')}
              className="w-full rounded-xl border border-[#B8FF3C]/20 bg-[#B8FF3C]/[0.04] p-4 text-left hover:bg-[#B8FF3C]/[0.08] hover:border-[#B8FF3C]/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B8FF3C]/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M22 10H18a2 2 0 000 4h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {connectedWallet ? `Pay with ${connectedWallet.name}` : 'Connect Wallet'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {connectedWallet
                      ? `${connectedWallet.address} — agent minted to your wallet`
                      : 'Phantom, MetaMask, or WalletConnect — you own the agent NFT'}
                  </p>
                </div>
                {connectedWallet && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Connected</span>
                )}
                <svg className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
              <div className="relative flex justify-center text-[10px]"><span className="bg-[#111118] px-3 text-gray-600">or</span></div>
            </div>

            {/* Gas Balance option */}
            <button
              onClick={() => gasBalance >= plan.price ? handleGasBalanceDeploy() : setStage('gas-balance')}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Use Gas Balance</p>
                  <p className="text-[11px] text-gray-500">
                    Balance: <span className={gasBalance >= plan.price ? 'text-emerald-400' : 'text-amber-400'}>${gasBalance.toFixed(2)}</span>
                    {gasBalance < plan.price && <span className="text-red-400/60"> — needs ${(plan.price - gasBalance).toFixed(2)} more</span>}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          </div>

          <p className="text-[10px] text-gray-600 text-center">
            Your agent will be deployed on-chain as an NFT. Wallet deployment gives you full ownership.
          </p>
        </div>
      )}

      {/* Stage: Wallet connect */}
      {stage === 'wallet-connect' && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Connect Wallet</h3>
            <p className="text-sm text-gray-400">Choose your wallet to deploy and own your agent</p>
          </div>

          <div className="space-y-2">
            {WALLETS.map(wallet => (
              <button
                key={wallet.id}
                onClick={() => handleWalletConnect(wallet.id)}
                disabled={connecting}
                className={`w-full rounded-xl border p-3.5 flex items-center gap-3 transition-all ${
                  connecting && selectedWallet === wallet.id
                    ? 'border-[#B8FF3C]/30 bg-[#B8FF3C]/[0.05]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                } disabled:opacity-50`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: `${wallet.color}25`, color: wallet.color }}
                >
                  {wallet.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-200">{wallet.name}</p>
                  <p className="text-[10px] text-gray-500">{wallet.chain}</p>
                </div>
                {connecting && selectedWallet === wallet.id ? (
                  <svg className="w-5 h-5 animate-spin text-[#B8FF3C]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setStage('choose')} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1">
            Back
          </button>
        </div>
      )}

      {/* Stage: Wallet connected, confirm deploy */}
      {stage === 'wallet-confirm' && connectedWallet && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Wallet Connected</h3>
            <p className="text-sm text-gray-400">{connectedWallet.name} &middot; {connectedWallet.address}</p>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Plan</span>
              <span className="font-semibold text-white">{plan.name}</span>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Price</span>
              <span className="font-semibold text-white">${plan.price}</span>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Pay in SOL</span>
              <span className="font-semibold text-[#B8FF3C]">{solAmount > 0 ? `${solAmount} SOL` : 'Loading...'}</span>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Agents</span>
              <span className="font-semibold text-white">{plan.agents}</span>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">From</span>
              <span className="font-semibold text-emerald-400">{connectedWallet.address}</span>
            </div>
          </div>

          {txError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <span className="text-xs text-red-400">{txError}</span>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleWalletDeploy}
              disabled={solAmount <= 0}
              className="w-full py-3.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#B8FF3C]/20 active:scale-[0.98] disabled:opacity-40"
            >
              Pay {solAmount > 0 ? `${solAmount} SOL` : '...'} &amp; Deploy
            </button>
            <p className="text-[10px] text-gray-600 text-center">Phantom will ask you to approve the transaction</p>
          </div>
        </div>
      )}

      {/* Stage: Gas balance insufficient */}
      {stage === 'gas-balance' && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Insufficient Gas Balance</h3>
            <p className="text-sm text-gray-400">
              You need <span className="text-white font-semibold">${plan.price}</span> but have <span className="text-amber-400 font-semibold">${gasBalance.toFixed(2)}</span>
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setStage('deposit')}
              className="w-full rounded-xl border border-[#B8FF3C]/20 bg-[#B8FF3C]/[0.04] p-3.5 text-left hover:bg-[#B8FF3C]/[0.08] transition-all"
            >
              <p className="text-sm font-semibold text-white">Fund Gas Balance</p>
              <p className="text-[11px] text-gray-500">Send crypto to your deposit address</p>
            </button>

            <button
              onClick={() => setStage('wallet-connect')}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left hover:bg-white/[0.04] transition-all"
            >
              <p className="text-sm font-semibold text-white">Connect Wallet Instead</p>
              <p className="text-[11px] text-gray-500">Pay directly from your wallet</p>
            </button>
          </div>

          <button onClick={() => setStage('choose')} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1">
            Back
          </button>
        </div>
      )}

      {/* Stage: Deposit */}
      {stage === 'deposit' && !depositSubmitted && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">Fund Gas Balance</h3>
            <p className="text-sm text-gray-400">Send SOL/USDT/USDC to the Solana address below</p>
          </div>

          {/* Solana deposit address */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Solana Deposit Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] text-gray-200 font-mono bg-white/[0.04] rounded-lg px-3 py-2 truncate">
                {SOLANA_ADDRESS}
              </code>
              <button
                onClick={handleCopyAddress}
                className="shrink-0 px-3 py-2 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 text-xs font-medium text-[#B8FF3C] hover:bg-[#B8FF3C]/20 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Amount needed */}
          <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-3 text-center">
            <p className="text-xs text-gray-400">Amount needed for {plan.name} plan</p>
            <p className="text-2xl font-black text-white mt-1">${(plan.price - gasBalance).toFixed(2)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Current balance: ${gasBalance.toFixed(2)}</p>
          </div>

          {/* Confirm deposit amount */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Amount you sent (USDT)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#B8FF3C]/40 focus:ring-1 focus:ring-[#B8FF3C]/20 transition-all"
            />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">Upload Payment Receipt</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="flex items-center justify-center gap-2 w-full bg-white/[0.04] border border-dashed border-white/[0.12] rounded-xl px-4 py-4 text-sm text-gray-400 hover:border-[#B8FF3C]/30 hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                {receiptFile ? (
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-emerald-400 text-xs truncate max-w-[200px]">{receiptFile.name}</span>
                  </div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload screenshot or PDF</span>
                  </>
                )}
              </label>
            </div>
            {receiptPreview && receiptFile?.type.startsWith('image/') && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.08]">
                <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-32 object-contain bg-black/40" />
              </div>
            )}
          </div>

          <button
            onClick={handleDepositSubmit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0 || !receiptFile}
            className="w-full py-3.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#B8FF3C]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Payment &amp; Receipt
          </button>

          <div className="space-y-1.5 text-[10px] text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">&#x26A0;</span>
              <span>Deposits require admin verification before crediting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">&#x26A0;</span>
              <span>Only send SOL, USDT, or USDC on Solana network</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">&#x26A0;</span>
              <span>Receipt upload is required for manual verification</span>
            </div>
          </div>

          <button onClick={() => setStage('choose')} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1">
            Back
          </button>
        </div>
      )}

      {/* Stage: Deposit submitted */}
      {stage === 'deposit' && depositSubmitted && (
        <div className="space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Deposit Pending</h3>
            <p className="text-sm text-gray-400">
              Your deposit of <span className="text-white font-semibold">${depositAmount}</span> is being reviewed
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs text-gray-400 space-y-2">
            <p>Our team will verify your transaction and credit your Gas Balance.</p>
            <p>You&apos;ll be notified once approved. This usually takes a few minutes.</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-200 hover:bg-white/[0.1] transition-all"
          >
            Done
          </button>
        </div>
      )}

      {/* Stage: Deploying */}
      {stage === 'deploying' && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <svg className="w-12 h-12 animate-spin text-[#B8FF3C]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          <p className="text-sm font-semibold text-gray-200">{txStatus || 'Processing...'}</p>
          <p className="text-xs text-gray-500">Do not close this window</p>
        </div>
      )}

      {/* Stage: Pending admin approval */}
      {stage === 'pending' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B8FF3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Deploying</h3>
            <p className="text-sm text-gray-400">You will be notified when your agent is live</p>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Payment received</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
              </div>
              <span className="text-xs text-amber-400">Minting agent NFT on-chain...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
              </div>
              <span className="text-xs text-gray-600">Agent goes live</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            This usually takes a few minutes. Check your dashboard for updates.
          </p>

          <button
            onClick={() => { onClose(); router.push('/dashboard'); }}
            className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-200 hover:bg-white/[0.1] transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </Modal>
  );
}

export { DeploymentModal };
