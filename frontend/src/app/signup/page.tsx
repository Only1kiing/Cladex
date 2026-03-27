'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
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
      // Handle paste
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
    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setVerifying(false);

    // Any 6-digit code works for demo
    onVerified();
  }, [code, onVerified]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      handleVerify();
    }
  }, [code, handleVerify]);

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      {/* Email icon */}
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

      {/* Code inputs */}
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
        <p className="text-sm text-hunter-400 mb-4">{error}</p>
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
    </motion.div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signup, connectWallet } = useAuth();

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
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const validateFields = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Name is required.';
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
      const result = await signup(name, email, password);
      if (result.success) {
        setShowVerification(true);
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
    router.push('/onboarding');
  };

  const handleConnectWallet = async () => {
    setError('');
    setWalletLoading(true);
    try {
      const result = await connectWallet();
      if (result.success && result.address) {
        setWalletAddress(result.address);
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
            {showVerification
              ? 'One last step to secure your account'
              : 'Create your account and start trading'}
          </p>
        </div>

        <Card padding="lg" className="border-white/[0.08] backdrop-blur-xl bg-[#111118]/80">
          <AnimatePresence mode="wait">
            {showVerification ? (
              <VerificationStep
                key="verification"
                email={email}
                onVerified={handleVerified}
              />
            ) : (
              <motion.div
                key="signup-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
              >
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

                {/* Signup Form */}
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
