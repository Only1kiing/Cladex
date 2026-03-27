'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 7H3V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 7L5 3H19L21 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 12C17 12.5523 16.5523 13 16 13C15.4477 13 15 12.5523 15 12C15 11.4477 15.4477 11 16 11C16.5523 11 17 11.4477 17 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, connectWallet } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setError('');
    setWalletLoading(true);
    try {
      const result = await connectWallet();
      if (result.success && result.address) {
        setWalletAddress(result.address);
        // Brief delay to show the connected address before redirect
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        setError(result.error || 'Wallet connection failed.');
      }
    } catch {
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f] overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#B8FF3C]/[0.07] blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.05] blur-[100px] animate-pulse-slow [animation-delay:1.5s]" />
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
            Sign in to your trading dashboard
          </p>
        </div>

        <Card padding="lg" className="border-white/[0.08] backdrop-blur-xl bg-[#111118]/80">
          {/* Global error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg bg-hunter-500/10 border border-hunter-500/20 px-4 py-3 text-sm text-hunter-400 mb-5"
            >
              {error}
            </motion.div>
          )}

          {/* Connect Wallet - Primary Auth */}
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={walletLoading || !!walletAddress}
            className="w-full relative group overflow-hidden rounded-xl p-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/50 disabled:opacity-70"
          >
            <div className="absolute inset-0 bg-[#B8FF3C] opacity-100 group-hover:brightness-110 transition-opacity" />
            <div className="relative flex items-center justify-center gap-3 rounded-[11px] bg-[#B8FF3C] px-6 py-3.5 text-black font-bold text-sm">
              {walletLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Connecting Wallet...</span>
                </>
              ) : walletAddress ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Connected: {walletAddress}</span>
                </>
              ) : (
                <>
                  <WalletIcon />
                  <span>Connect Wallet</span>
                </>
              )}
            </div>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e1e2e]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#111118] px-3 text-gray-500">or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
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
        </Card>

        <p className="mt-6 text-center text-xs text-gray-600">
          By signing in you agree to Cladex&apos;s Terms of Service and Privacy
          Policy.
        </p>
      </motion.div>
    </div>
  );
}
