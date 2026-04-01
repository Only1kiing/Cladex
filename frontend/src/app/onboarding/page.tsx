'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  BarChart3,
  Crosshair,
  Eye,
  Key,
  Info,
  Check,
  Zap,
  Rocket,
  MessageSquare,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { AgentPersonality, ExchangeId } from '@/types';
import { Logo } from '@/components/ui/Logo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const SUGGESTION_CHIPS = [
  'I want aggressive growth',
  'Keep my money safe',
  'I trust the data',
  'Show me the future',
];

const PERSONALITY_META: Record<
  AgentPersonality,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }
> = {
  nova: {
    label: 'NOVA',
    color: 'text-nova-400',
    bgColor: 'bg-nova-500/10',
    borderColor: 'border-nova-500/30',
    icon: <Shield size={18} />,
  },
  sage: {
    label: 'SAGE',
    color: 'text-sage-400',
    bgColor: 'bg-sage-500/10',
    borderColor: 'border-sage-500/30',
    icon: <BarChart3 size={18} />,
  },
  apex: {
    label: 'APEX',
    color: 'text-apex-400',
    bgColor: 'bg-apex-500/10',
    borderColor: 'border-apex-500/30',
    icon: <Crosshair size={18} />,
  },
  echo: {
    label: 'ECHO',
    color: 'text-echo-400',
    bgColor: 'bg-echo-500/10',
    borderColor: 'border-echo-500/30',
    icon: <Eye size={18} />,
  },
};

interface ExchangeOption {
  id: ExchangeId;
  name: string;
  icon: string;
}

const EXCHANGES: ExchangeOption[] = [
  { id: 'binance', name: 'Binance', icon: 'B' },
  { id: 'coinbase', name: 'Coinbase', icon: 'C' },
  { id: 'kraken', name: 'Kraken', icon: 'K' },
  { id: 'bybit', name: 'Bybit', icon: 'Y' },
  { id: 'okx', name: 'OKX', icon: 'O' },
];

// ---------------------------------------------------------------------------
// Mock agent generator (simulates an API call)
// ---------------------------------------------------------------------------

interface MockAgent {
  name: string;
  personality: AgentPersonality;
  strategy: string;
  riskLevel: number; // 0-100
  assets: string[];
}

function generateMockAgent(prompt: string): MockAgent {
  const lower = prompt.toLowerCase();
  let personality: AgentPersonality = 'sage';
  let riskLevel = 50;
  let assets = ['BTC/USDT', 'ETH/USDT'];

  if (lower.includes('protect') || lower.includes('low risk') || lower.includes('safe') || lower.includes('keep my money')) {
    personality = 'nova';
    riskLevel = 20;
    assets = ['BTC/USDT', 'ETH/USDT', 'USDC/USDT'];
  } else if (lower.includes('aggressive') || lower.includes('altcoin') || lower.includes('moon') || lower.includes('growth')) {
    personality = 'apex';
    riskLevel = 85;
    assets = ['SOL/USDT', 'AVAX/USDT', 'DOGE/USDT', 'PEPE/USDT'];
  } else if (lower.includes('dca') || lower.includes('top 10') || lower.includes('diversif') || lower.includes('data') || lower.includes('trust')) {
    personality = 'echo';
    riskLevel = 40;
    assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT'];
  } else if (lower.includes('future') || lower.includes('show me')) {
    personality = 'echo';
    riskLevel = 55;
    assets = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
  }

  const names: Record<AgentPersonality, string[]> = {
    nova: ['Sentinel Alpha', 'Shield Prime', 'Bastion'],
    sage: ['Quant Zero', 'DataMind', 'Nexus'],
    apex: ['Viper', 'Blitz', 'Apex Striker'],
    echo: ['Pythia', 'Foresight', 'Chronos'],
  };

  const pool = names[personality];
  const name = pool[Math.floor(Math.random() * pool.length)];

  return {
    name,
    personality,
    strategy: prompt || 'Balanced trading strategy with moderate risk.',
    riskLevel,
    assets,
  };
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Strategy', 'Preview', 'Deploy', 'Exchange'];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className="relative flex flex-col items-center">
            <motion.div
              className={[
                'w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold border-2 transition-colors duration-300',
                i < current
                  ? 'bg-[#B8FF3C] border-[#B8FF3C] text-black'
                  : i === current
                  ? 'border-[#B8FF3C] text-[#B8FF3C] bg-[#B8FF3C]/10'
                  : 'border-white/10 text-gray-600 bg-transparent',
              ].join(' ')}
              animate={i === current ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {i < current ? <Check size={14} /> : i + 1}
            </motion.div>
            <span className={[
              'text-[9px] sm:text-[10px] mt-1 sm:mt-1.5 font-medium',
              i <= current ? 'text-gray-400' : 'text-gray-600',
            ].join(' ')}>
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className="w-6 sm:w-12 h-0.5 mx-0.5 sm:mx-1 mb-4 sm:mb-5">
              <div
                className={[
                  'h-full rounded-full transition-colors duration-500',
                  i < current ? 'bg-[#B8FF3C]' : 'bg-white/10',
                ].join(' ')}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Meter (shared)
// ---------------------------------------------------------------------------

function RiskMeter({ level, max = 100 }: { level: number; max?: number }) {
  const pct = (level / max) * 100;
  const color =
    pct <= 33
      ? 'from-nova-500 to-nova-400'
      : pct <= 66
      ? 'from-yellow-500 to-amber-400'
      : 'from-apex-500 to-apex-400';

  const label = pct <= 33 ? 'Low' : pct <= 66 ? 'Medium' : 'High';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Risk Level</span>
        <span className="text-gray-300 font-medium">{label} ({level}/{max === 100 ? 10 : max})</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 -- Strategy Selection (Instant Deploy)
// ---------------------------------------------------------------------------

function StepStrategy({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const meta = PERSONALITY_META.nova;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
          Let&apos;s launch your first agent
        </h2>
        <p className="text-base text-gray-500">
          No setup. No complexity. We&apos;ve prepared one for you.
        </p>
      </div>

      {/* Pre-built agent card */}
      <Card padding="lg" className="space-y-4 border-nova-500/20 bg-nova-500/[0.03] max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-100">Your First Agent</p>
            <p className="text-xs text-gray-500 mt-0.5">Balanced Growth</p>
          </div>
          <span
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
              meta.bgColor,
              meta.color,
              meta.borderColor,
            ].join(' ')}
          >
            {meta.icon}
            {meta.label}
          </span>
        </div>

        {/* Risk */}
        <RiskMeter level={40} />

        {/* Assets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Assets:</span>
          {['BTC', 'ETH'].map((asset) => (
            <span
              key={asset}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 font-medium"
            >
              {asset}
            </span>
          ))}
        </div>
      </Card>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className={[
              'px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-200',
              value === chip
                ? 'bg-[#B8FF3C]/20 border-[#B8FF3C]/40 text-[#B8FF3C]'
                : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-white/[0.15] hover:text-gray-300',
            ].join(' ')}
          >
            <Sparkles size={12} className="inline mr-1.5 -mt-0.5" />
            {chip}
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={onNext}
          icon={<Rocket size={18} />}
          iconPosition="right"
          className="w-full max-w-xs bg-[#B8FF3C] hover:brightness-110 text-black font-bold text-base py-3"
        >
          Start Agent
        </Button>
        <p className="text-xs text-gray-600">Takes less than 10 seconds</p>
      </div>

      {/* Custom strategy textarea (collapsed) */}
      <details className="group">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors text-center">
          Or describe your own strategy...
        </summary>
        <div className="mt-3">
          <textarea
            className={[
              'w-full rounded-xl border bg-surface/60 backdrop-blur-sm',
              'text-gray-100 placeholder:text-gray-500',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#B8FF3C]/30 focus:border-[#B8FF3C]/50',
              'border-white/[0.08] hover:border-white/[0.15]',
              'px-4 py-3 text-sm min-h-[100px] resize-none',
            ].join(' ')}
            placeholder="e.g. I want a conservative bot that buys BTC dips and protects against big losses..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Agent Preview
// ---------------------------------------------------------------------------

function StepAgent({
  agent,
  onBack,
  onNext,
}: {
  agent: MockAgent;
  onBack: () => void;
  onNext: () => void;
}) {
  const meta = PERSONALITY_META[agent.personality];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
          Meet your agent
        </h2>
        <p className="text-base text-gray-500">
          Here&apos;s what we built for you
        </p>
      </div>

      <Card padding="lg" className="space-y-5">
        {/* Name + personality */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-100">{agent.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">AI Trading Agent</p>
          </div>
          <span
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
              meta.bgColor,
              meta.color,
              meta.borderColor,
            ].join(' ')}
          >
            {meta.icon}
            {meta.label}
          </span>
        </div>

        {/* Strategy */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Strategy</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {agent.strategy}
          </p>
        </div>

        {/* Risk meter */}
        <RiskMeter level={agent.riskLevel} />

        {/* Assets */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Trading Pairs</p>
          <div className="flex flex-wrap gap-2">
            {agent.assets.map((asset) => (
              <span
                key={asset}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 font-medium"
              >
                {asset}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          icon={<Zap size={18} />}
          iconPosition="right"
          className="bg-[#B8FF3C] hover:brightness-110 text-black font-bold"
        >
          Deploy Agent
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 -- Success Moment
// ---------------------------------------------------------------------------

const AGENT_MESSAGES = [
  { text: 'Analyzing BTC movement\u2026', delay: 1000 },
  { text: 'Volume increasing. Watching closely.', delay: 3000 },
  { text: 'Entering position\u2026', delay: 5000 },
];

function TypingMessage({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      idx.current += 1;
      if (idx.current <= text.length) {
        setDisplayed(text.slice(0, idx.current));
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, 30);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          className="inline-block w-[2px] h-4 bg-nova-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}

function StepSuccess({
  agentName,
  onFinish,
  onConnectExchange,
}: {
  agentName: string;
  onFinish: () => void;
  onConnectExchange: () => void;
}) {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    AGENT_MESSAGES.forEach((msg, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleMessages((prev) => [...prev, i]);
        }, msg.delay),
      );
    });
    timers.push(
      setTimeout(() => {
        setShowReward(true);
      }, 6500),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="text-center space-y-8 py-4">
      {/* Success icon with green glow */}
      <div className="relative mx-auto w-24 h-24">
        {/* Pulsing glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-nova-500/20"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-nova-500/10"
          animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        {/* Icon circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="relative w-24 h-24 rounded-full bg-nova-500/20 border-2 border-nova-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.15)]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Check size={40} className="text-nova-400" />
          </motion.div>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
          Your agent is now running
        </h2>
        <p className="text-base text-gray-500 max-w-sm mx-auto">
          It&apos;s already scanning the market for opportunities.
        </p>
      </div>

      {/* Live agent messages */}
      <div className="space-y-3 text-left max-w-sm mx-auto">
        <AnimatePresence>
          {visibleMessages.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <MessageSquare size={16} className="text-nova-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">
                <TypingMessage text={AGENT_MESSAGES[i].text} />
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Points reward */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-500/10 border border-yellow-500/20"
          >
            <Award size={18} className="text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-300">
              Your agent earned +100 $CLDX for deployment
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={onFinish}
          icon={<Rocket size={18} />}
          iconPosition="right"
          className="w-full max-w-xs bg-[#B8FF3C] hover:brightness-110 text-black font-bold text-base py-3"
        >
          Go to Dashboard
        </Button>
        <button
          type="button"
          onClick={onConnectExchange}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4 decoration-gray-700 hover:decoration-gray-500"
        >
          Connect Exchange for Live Trading
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 -- Exchange Connect (optional)
// ---------------------------------------------------------------------------

function StepExchange({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
          Trade with real funds
        </h2>
        <p className="text-base text-gray-500">
          Connect your exchange to go live
        </p>
      </div>

      {/* Exchange grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {EXCHANGES.map((ex) => {
          const selected = selectedExchange === ex.id;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelectedExchange(ex.id)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                selected
                  ? 'border-[#B8FF3C] bg-[#B8FF3C]/[0.06]'
                  : 'border-white/[0.06] bg-surface/60 hover:border-white/[0.12] hover:bg-surface/80',
              ].join(' ')}
            >
              <div
                className={[
                  'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold',
                  selected
                    ? 'bg-[#B8FF3C]/20 text-[#B8FF3C]'
                    : 'bg-white/[0.06] text-gray-400',
                ].join(' ')}
              >
                {ex.icon}
              </div>
              <span
                className={[
                  'text-sm font-medium',
                  selected ? 'text-[#B8FF3C]' : 'text-gray-400',
                ].join(' ')}
              >
                {ex.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* API inputs */}
      <AnimatePresence>
        {selectedExchange && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            <Input
              label="API Key"
              type="text"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              icon={<Key size={16} />}
            />
            <Input
              label="API Secret"
              type="password"
              placeholder="Enter your API secret"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              icon={<Key size={16} />}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust badges */}
      <div className="flex items-start gap-3 rounded-xl bg-[#B8FF3C]/[0.05] border border-[#B8FF3C]/[0.12] p-4">
        <Info size={18} className="text-[#B8FF3C] shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          We only request trade permissions. Your funds stay in your exchange.
          Cladex never has withdrawal access.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onFinish}>
            Skip &mdash; Stay in Demo Mode
          </Button>
          <Button
            disabled={!selectedExchange || !apiKey || !apiSecret}
            onClick={onFinish}
            icon={<Zap size={16} />}
          >
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Onboarding Page
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1 state
  const [strategy, setStrategy] = useState('');

  // Step 2 state (generated agent)
  const [agent, setAgent] = useState<MockAgent | null>(null);

  const goNext = useCallback(() => {
    // When leaving step 0, generate the agent
    if (step === 0) {
      const prompt = strategy.trim() || 'Balanced Growth';
      setAgent(generateMockAgent(prompt));
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [step, strategy]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const goToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const goToExchange = useCallback(() => {
    setDirection(1);
    setStep(3);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] overflow-hidden px-4 py-12">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-[#B8FF3C]/[0.05] blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.04] blur-[120px] animate-pulse-slow [animation-delay:2s]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        {/* Step indicator */}
        <div className="mb-12">
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>

        {/* Steps with animation */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {step === 0 && (
              <StepStrategy
                value={strategy}
                onChange={setStrategy}
                onNext={goNext}
              />
            )}
            {step === 1 && agent && (
              <StepAgent agent={agent} onBack={goBack} onNext={goNext} />
            )}
            {step === 2 && (
              <StepSuccess
                agentName={agent?.name || 'Your Agent'}
                onFinish={goToDashboard}
                onConnectExchange={goToExchange}
              />
            )}
            {step === 3 && (
              <StepExchange onBack={goBack} onFinish={goToDashboard} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
