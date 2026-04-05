'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Key, ShieldCheck, Gift, Sparkles } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EXCHANGES = [
  { id: 'bybit', name: 'Bybit', color: '#F7A600', letter: 'B' },
  { id: 'binance', name: 'Binance', color: '#F0B90B', letter: 'B' },
  { id: 'phantom', name: 'Phantom', color: '#AB9FF2', letter: 'P' },
  { id: 'mask', name: 'Mask', color: '#1C8CF0', letter: 'M' },
  { id: 'polymarket', name: 'Polymarket', color: '#00D395', letter: 'P' },
];

function ExchangeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 7L12 2L22 7L12 12L2 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VerificationStep({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setVerifying(true);
    try {
      await api.post('/auth/verify-email', { code: fullCode });
      setVerifying(false);
      onVerified();
    } catch (err) {
      setVerifying(false);
      const message = (err as { message?: string }).message || 'Invalid code. Please try again.';
      setError(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [code, onVerified]);

  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode) && !verifying) {
      handleVerify();
    }
  }, [code, handleVerify, verifying]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post('/auth/resend-code');
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend code. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
            stroke="#B8FF3C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Verify Your Email</h2>
      <p className="text-sm text-gray-400 mb-8">
        We sent a 6-digit code to{' '}
        <span className="text-[#B8FF3C] font-medium">{email}</span>
      </p>

      <div className="flex justify-center gap-2 sm:gap-2.5 mb-6">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleCodeChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] text-center text-xl font-bold text-white focus:border-[#B8FF3C] focus:ring-1 focus:ring-[#B8FF3C]/30 outline-none transition-all"
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-apex-400 mb-4">{error}</p>
      )}

      <Button
        type="button"
        fullWidth
        size="lg"
        loading={verifying}
        onClick={handleVerify}
        icon={<ArrowRight size={18} />}
        iconPosition="right"
      >
        Verify Email
      </Button>

      <div className="mt-5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm font-medium transition-colors disabled:text-gray-600 text-[#B8FF3C] hover:brightness-110"
        >
          {resendCooldown > 0
            ? `Resend Code (${resendCooldown}s)`
            : 'Resend Code'}
        </button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={onVerified}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}

function ClaimPointsStep({ onClaimed }: { onClaimed: () => void }) {
  const [claimed, setClaimed] = useState(false);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    setShowConfetti(true);
    // Animated count-up
    const start = performance.now();
    const duration = 1500;
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPoints(Math.round(10000 * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // Auto-advance after animation
    setTimeout(() => onClaimed(), 2800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      {/* Icon */}
      <div className="relative mx-auto w-20 h-20 mb-6">
        <motion.div
          animate={claimed ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.6 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#B8FF3C]/20 to-emerald-500/10 border border-[#B8FF3C]/30 flex items-center justify-center"
        >
          {claimed ? (
            <Sparkles size={36} className="text-[#B8FF3C]" />
          ) : (
            <Gift size={36} className="text-[#B8FF3C]" />
          )}
        </motion.div>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: (Math.random() - 0.5) * 120,
                  y: (Math.random() - 0.5) * 120,
                }}
                transition={{ duration: 1, delay: i * 0.05 }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: ['#B8FF3C', '#22c55e', '#818cf8', '#f59e0b', '#ec4899'][i % 5] }}
              />
            ))}
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        {claimed ? 'Points Claimed!' : 'Welcome Bonus'}
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        {claimed
          ? 'Your $CLDX points are ready to use'
          : 'Claim your welcome bonus to get started on Cladex'}
      </p>

      {/* Points display */}
      <div className="rounded-xl border border-[#B8FF3C]/20 bg-[#B8FF3C]/[0.05] px-6 py-5 mb-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-black text-white tabular-nums">
            {claimed ? displayPoints.toLocaleString() : '10,000'}
          </span>
          <span className="text-lg font-bold text-[#B8FF3C]">$CLDX</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Use points to boost agents, unlock slots, and earn rewards</p>
      </div>

      {!claimed ? (
        <button
          type="button"
          onClick={handleClaim}
          className="w-full rounded-xl bg-[#B8FF3C] px-6 py-3.5 text-sm font-bold text-black hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/50 shadow-lg shadow-[#B8FF3C]/20"
        >
          Claim 10,000 $CLDX Points
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-400"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Successfully claimed!
        </motion.div>
      )}
    </motion.div>
  );
}

const AGENT_MESSAGES = [
  { agent: 'Raze', message: 'SOL +4.2% in 20 min \u26A1', color: 'text-red-400', profit: '+$127' },
  { agent: 'Knox', message: 'Portfolio secured. 0.8% drawdown \uD83D\uDEE1\uFE0F', color: 'text-emerald-400', profit: null },
  { agent: 'Iris', message: 'Called BTC reversal at $66.8k \uD83D\uDD2E', color: 'text-violet-400', profit: '+$340' },
  { agent: 'Byte', message: 'ETH volume up 34%. Bull flag \uD83D\uDCCA', color: 'text-cyan-400', profit: null },
];

function AgentCommPreviewStep({ onConnectExchange }: { onConnectExchange: () => void }) {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= AGENT_MESSAGES.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  // Kick off the first message
  useEffect(() => {
    const timer = setTimeout(() => setVisibleCount(1), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <h2 className="text-xl font-bold text-white mb-6">Your agents are waiting</h2>

      <div className="space-y-2.5 mb-8 text-left">
        {AGENT_MESSAGES.map((msg, i) => (
          <motion.div
            key={msg.agent}
            initial={{ opacity: 0, x: -16 }}
            animate={i < visibleCount ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-bold text-sm ${msg.color}`}>{msg.agent}:</span>
              <span className="text-sm text-gray-300 truncate">{msg.message}</span>
            </div>
            {msg.profit && (
              <span className="ml-3 shrink-0 text-xs font-semibold text-[#B8FF3C]">{msg.profit}</span>
            )}
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="w-full rounded-xl bg-[#B8FF3C] px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/50"
      >
        Continue to Dashboard
      </button>

      <button
        type="button"
        onClick={onConnectExchange}
        className="inline-block mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        Connect Exchange Now
      </button>
    </motion.div>
  );
}

function ConnectExchangeStep() {
  const router = useRouter();
  const { connectExchange } = useAuth();

  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeConnected, setExchangeConnected] = useState(false);
  const [error, setError] = useState('');

  const selectedExchangeData = EXCHANGES.find((e) => e.id === selectedExchange);

  const handleConnect = async () => {
    if (!selectedExchange || !apiKey.trim() || !apiSecret.trim()) {
      setError('Please enter both API Key and API Secret.');
      return;
    }

    setError('');
    setExchangeLoading(true);
    try {
      const result = await connectExchange(selectedExchange, apiKey, apiSecret);
      if (result.success) {
        setExchangeConnected(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        setError(result.error || 'Exchange connection failed.');
      }
    } catch {
      setError('Failed to connect exchange. Please try again.');
    } finally {
      setExchangeLoading(false);
    }
  };

  const handleSkipDemo = () => {
    router.push('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-2">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mb-3">
          <ExchangeIcon />
        </div>
        <h2 className="text-lg font-bold text-white">Connect Exchange</h2>
        <p className="text-xs text-gray-500 mt-1">Link your exchange to enable live trading</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg bg-apex-500/10 border border-apex-500/20 px-4 py-3 text-sm text-apex-400"
        >
          {error}
        </motion.div>
      )}

      {/* Exchange selector grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EXCHANGES.map((exchange) => (
          <motion.button
            key={exchange.id}
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setSelectedExchange(exchange.id);
              setExchangeConnected(false);
              setApiKey('');
              setApiSecret('');
              setError('');
            }}
            className={`relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/50 ${
              selectedExchange === exchange.id
                ? 'border-[#B8FF3C]/60 bg-[#B8FF3C]/[0.08] text-white'
                : 'border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15] hover:text-gray-200'
            }`}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
              style={{ backgroundColor: exchange.color }}
            >
              {exchange.letter}
            </span>
            <span className="truncate">{exchange.name}</span>
            {selectedExchange === exchange.id && (
              <motion.div
                layoutId="signup-exchange-check"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#B8FF3C]"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* API Key fields */}
      <AnimatePresence>
        {selectedExchange && !exchangeConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              <Input
                label="API Key"
                type="text"
                placeholder={`Enter your ${selectedExchangeData?.name} API key`}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                icon={<Key size={16} />}
                autoComplete="off"
              />

              <Input
                label="API Secret"
                type="password"
                placeholder={`Enter your ${selectedExchangeData?.name} API secret`}
                value={apiSecret}
                onChange={(e) => { setApiSecret(e.target.value); setError(''); }}
                icon={<Lock size={16} />}
                autoComplete="off"
              />

              <button
                type="button"
                onClick={handleConnect}
                disabled={exchangeLoading || !apiKey.trim() || !apiSecret.trim()}
                className="w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-[#B8FF3C] opacity-100 group-hover:brightness-110 transition-opacity" />
                <div className="relative flex items-center justify-center gap-3 rounded-[11px] bg-[#B8FF3C] px-6 py-3 text-black font-bold text-sm">
                  {exchangeLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Connecting to {selectedExchangeData?.name}...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Connect Exchange</span>
                    </>
                  )}
                </div>
              </button>

              {/* Trust microcopy */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                {[
                  'Your funds stay on your exchange',
                  'Cladex cannot withdraw funds',
                  'Trade-only API access',
                  'Disconnect anytime',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-1.5 text-[11px] text-gray-500">
                    <svg className="mt-0.5 h-3 w-3 shrink-0 text-[#B8FF3C]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected status */}
      <AnimatePresence>
        {exchangeConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3 text-sm font-medium text-emerald-400"
          >
            <span>&#x2705; Connected — redirecting...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#1e1e2e]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#111118] px-3 text-gray-500">or</span>
        </div>
      </div>

      {/* Continue Demo */}
      <button
        onClick={handleSkipDemo}
        className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm font-medium text-gray-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-200"
      >
        Continue in Demo Mode
      </button>
    </motion.div>
  );
}

function SignupContent() {
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || undefined;

  // Steps: 'signup' | 'verification' | 'claim-points' | 'agent-comm-preview' | 'connect-exchange'
  const [step, setStep] = useState<'signup' | 'verification' | 'claim-points' | 'agent-comm-preview' | 'connect-exchange'>('signup');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateFields()) return;

    setLoading(true);
    try {
      const result = await signup(name, email, password, ref);
      if (result.success) {
        setStep('verification');
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = () => {
    setStep('claim-points');
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.success) {
        // Google sign-ups bypass email verification entirely - go straight to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error || 'Google sign-in failed. Please try again.');
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepSubtitle = {
    'signup': 'Get early access to AI agents trading crypto for you',
    'verification': 'One last step to secure your account',
    'claim-points': 'Claim your welcome bonus',
    'agent-comm-preview': 'See what your agents have been up to',
    'connect-exchange': 'Connect your exchange to go live',
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f] overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] rounded-full bg-[#B8FF3C]/[0.06] blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.05] blur-[100px] animate-pulse-slow [animation-delay:1.5s]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            {stepSubtitle[step]}
          </p>
        </div>

        <Card padding="lg" className="border-white/[0.08] backdrop-blur-xl bg-[#111118]/80">
          <AnimatePresence mode="wait">
            {/* ===== STEP 1: SIGNUP FORM ===== */}
            {step === 'signup' && (
              <motion.div
                key="signup-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg bg-apex-500/10 border border-apex-500/20 px-4 py-3 text-sm text-apex-400 mb-5"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    icon={<User size={16} />}
                    autoComplete="name"
                    error={fieldErrors.name}
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    icon={<Mail size={16} />}
                    autoComplete="email"
                    error={fieldErrors.email}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    icon={<Lock size={16} />}
                    autoComplete="new-password"
                    hint="Must be at least 8 characters"
                    error={fieldErrors.password}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    icon={<Lock size={16} />}
                    autoComplete="new-password"
                    error={fieldErrors.confirmPassword}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={loading}
                    icon={<ArrowRight size={18} />}
                    iconPosition="right"
                  >
                    Create Account
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#1e1e2e]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#111118] px-3 text-gray-500">or</span>
                  </div>
                </div>

                {/* Google Sign-In */}
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={(msg) => setError(msg)}
                  text="signup_with"
                />

                <div className="mt-6 text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-[#B8FF3C] hover:brightness-110 font-medium transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ===== STEP 2: EMAIL VERIFICATION ===== */}
            {step === 'verification' && (
              <VerificationStep
                key="verification"
                email={email}
                onVerified={handleVerified}
              />
            )}

            {/* ===== STEP 3: CLAIM $CLDX POINTS ===== */}
            {step === 'claim-points' && (
              <ClaimPointsStep key="claim-points" onClaimed={() => setStep('agent-comm-preview')} />
            )}

            {/* ===== STEP 4: MARKET INTELLIGENCE PREVIEW ===== */}
            {step === 'agent-comm-preview' && (
              <AgentCommPreviewStep key="agent-comm-preview" onConnectExchange={() => setStep('connect-exchange')} />
            )}

            {/* ===== STEP 4: CONNECT EXCHANGE ===== */}
            {step === 'connect-exchange' && (
              <ConnectExchangeStep key="connect-exchange" />
            )}
          </AnimatePresence>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-600">
          By creating an account you agree to Cladex&apos;s Terms of Service and
          Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <SignupContent />
    </Suspense>
  );
}
