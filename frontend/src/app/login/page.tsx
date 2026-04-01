'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Key, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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

export default function LoginPage() {
  const router = useRouter();
  const { login, connectExchange } = useAuth();

  // Step: 'login' | 'connect-exchange'
  const [step, setStep] = useState<'login' | 'connect-exchange'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  // Exchange connection state
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeConnected, setExchangeConnected] = useState(false);

  const validateFields = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
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
      const result = await login(email, password);
      if (result.success) {
        setStep('connect-exchange');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectExchange = async () => {
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

  const selectedExchangeData = EXCHANGES.find((e) => e.id === selectedExchange);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f] overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px] rounded-full bg-[#B8FF3C]/[0.07] blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full bg-emerald-500/[0.05] blur-[100px] animate-pulse-slow [animation-delay:1.5s]" />
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
            {step === 'login'
              ? 'Sign in to your trading dashboard'
              : 'Connect your exchange to start trading'}
          </p>
        </div>

        <Card padding="lg" className="border-white/[0.08] backdrop-blur-xl bg-[#111118]/80">
          {/* Global error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg bg-apex-500/10 border border-apex-500/20 px-4 py-3 text-sm text-apex-400 mb-5"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ===== STEP 1: EMAIL/PASSWORD LOGIN ===== */}
            {step === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSubmit} className="space-y-5">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    icon={<Lock size={16} />}
                    autoComplete="current-password"
                    error={fieldErrors.password}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    loading={loading}
                    icon={<ArrowRight size={18} />}
                    iconPosition="right"
                  >
                    Log In
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="text-[#B8FF3C] hover:brightness-110 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ===== STEP 2: CONNECT EXCHANGE (after login) ===== */}
            {step === 'connect-exchange' && (
              <motion.div
                key="connect-exchange"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center mb-3">
                    <ExchangeIcon />
                  </div>
                  <h2 className="text-lg font-bold text-white">Connect Exchange</h2>
                  <p className="text-xs text-gray-500 mt-1">Link your exchange to enable live trading</p>
                </div>

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
                          layoutId="exchange-check"
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
                          onClick={handleConnectExchange}
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
            )}
          </AnimatePresence>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-600">
          By signing in you agree to Cladex&apos;s Terms of Service and Privacy
          Policy.
        </p>
      </motion.div>
    </div>
  );
}
