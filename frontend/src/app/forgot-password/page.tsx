'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('If that email is registered, a reset code has been sent. Check your inbox.');
      setStep('reset');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            {step === 'email' ? 'Enter your email to reset your password' : 'Enter the code and your new password'}
          </p>
        </div>

        <Card padding="lg" className="border-white/[0.08] backdrop-blur-xl bg-[#111118]/80">
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg bg-apex-500/10 border border-apex-500/20 px-4 py-3 text-sm text-apex-400 mb-5"
            >
              {error}
            </motion.div>
          )}

          {/* Success message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 mb-5"
            >
              {success}
            </motion.div>
          )}

          {step === 'email' && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                icon={<Mail size={16} />}
                autoComplete="email"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
              >
                Send Reset Code
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <Input
                label="Reset Code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                icon={<KeyRound size={16} />}
                autoComplete="one-time-code"
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                icon={<Lock size={16} />}
                autoComplete="new-password"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                icon={<Lock size={16} />}
                autoComplete="new-password"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
              >
                Reset Password
              </Button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Didn&apos;t receive a code? Try again
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link
              href="/login"
              className="text-[#B8FF3C] hover:brightness-110 font-medium transition-colors"
            >
              Log in
            </Link>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-600">
          By using Cladex you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
