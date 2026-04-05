'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function SignupPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Google sign-up failed. Please try again.');
      }
    } catch {
      setError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f] overflow-hidden px-4">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] rounded-full bg-[#B8FF3C]/[0.07] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] rounded-full bg-emerald-500/[0.05] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="inline-block mb-4">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Launch your free agent</h1>
          <p className="text-sm text-gray-500">Get 10,000 founding points instantly.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111118]/80 backdrop-blur-xl p-6 space-y-3">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Google Sign-Up */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            text="signup_with"
          />

          {/* Connect Wallet — disabled */}
          <button
            disabled
            className="relative w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-gray-500 font-medium text-sm cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M22 10H18a2 2 0 000 4h4" />
              <circle cx="18" cy="12" r="1" fill="currentColor" />
            </svg>
            <span>Connect Wallet</span>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 uppercase tracking-wide">
              Soon
            </span>
          </button>

          {loading && (
            <p className="text-[11px] text-gray-500 text-center pt-2">Creating your account...</p>
          )}

          {/* Trust microcopy */}
          <div className="pt-4 flex items-center justify-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
              Free to start
            </span>
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
              Non-custodial
            </span>
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
              No email codes
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#B8FF3C] hover:brightness-110 font-medium">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-gray-600">
          By signing up you agree to Cladex&apos;s{' '}
          <Link href="/terms" className="hover:text-gray-400">Terms</Link>{' '}&amp;{' '}
          <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>.
        </p>
      </motion.div>
    </div>
  );
}
