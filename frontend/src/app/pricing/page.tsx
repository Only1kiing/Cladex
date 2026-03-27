'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                    */
/* ------------------------------------------------------------------ */

function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ZapIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-5 4-5-4-5 4-5-4z" />
      <path d="M5 16h14v2H5z" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function NonCustodialIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ChainIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ContractIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tier: string;
  icon: React.ReactNode;
  priceLabel: string;
  priceSubLabel: string;
  originalPrice: string | null;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  ctaStyle: 'ghost' | 'blue' | 'purple';
  popular: boolean;
  glowColor: string;
  borderGlow: string;
  isSubscription: boolean;
}

const plans: Plan[] = [
  {
    name: 'Free Agent',
    tier: 'Free',
    icon: <ShieldIcon className="w-6 h-6" />,
    priceLabel: '$0',
    priceSubLabel: 'forever',
    originalPrice: null,
    features: [
      { text: '1 free agent deployment', included: true },
      { text: 'Basic DCA strategy only', included: true },
      { text: 'Community Agent Comms access', included: true },
      { text: '5 gifts/day', included: true },
      { text: 'All strategies', included: false },
      { text: 'Priority execution', included: false },
      { text: 'Marketplace access', included: false },
    ],
    cta: 'Deploy Free Agent',
    ctaHref: '/signup',
    ctaStyle: 'ghost',
    popular: false,
    glowColor: 'from-emerald-500/10 to-emerald-500/0',
    borderGlow: 'group-hover:shadow-emerald-500/20',
    isSubscription: false,
  },
  {
    name: 'Agent Mint',
    tier: 'Per Agent',
    icon: <ZapIcon className="w-6 h-6" />,
    priceLabel: '$20',
    priceSubLabel: 'per agent',
    originalPrice: '$100',
    features: [
      { text: 'Deploy additional custom agents', included: true },
      { text: 'All strategies unlocked per agent', included: true },
      { text: 'Real-time execution', included: true },
      { text: 'Agent lives on-chain', included: true },
      { text: '15% performance fee on profits', included: true },
      { text: 'Unlimited mints (free)', included: false },
      { text: 'Priority execution', included: false },
    ],
    cta: 'Mint via Smart Contract',
    ctaHref: '/signup?plan=mint',
    ctaStyle: 'blue',
    popular: true,
    glowColor: 'from-[#B8FF3C]/10 to-[#B8FF3C]/0',
    borderGlow: 'group-hover:shadow-[#B8FF3C]/15',
    isSubscription: false,
  },
  {
    name: 'Pro',
    tier: 'Subscription',
    icon: <CrownIcon className="w-6 h-6" />,
    priceLabel: '$29',
    priceSubLabel: '/mo',
    originalPrice: null,
    features: [
      { text: 'Unlimited agent mints (free)', included: true },
      { text: 'Priority execution', included: true },
      { text: 'Marketplace access', included: true },
      { text: '5% performance fee (vs 15% free)', included: true },
      { text: 'Custom AI strategies', included: true },
      { text: 'API access', included: true },
      { text: 'All Agent Mint features included', included: true },
    ],
    cta: 'Subscribe \u2014 $29/mo',
    ctaHref: '/signup?plan=pro',
    ctaStyle: 'purple',
    popular: false,
    glowColor: 'from-[#B8FF3C]/10 via-emerald-500/10 to-[#B8FF3C]/0',
    borderGlow: 'group-hover:shadow-[#B8FF3C]/15',
    isSubscription: true,
  },
];

const faqs = [
  {
    q: 'How do smart contract payments work?',
    a: 'All payments go through audited smart contracts on Base network. No middlemen.',
  },
  {
    q: 'What happens to my agent on-chain?',
    a: 'Your agent config is stored as an NFT. You own it forever.',
  },
  {
    q: 'Can I sell my agent?',
    a: 'Yes! Trained agents can be listed on the marketplace.',
  },
  {
    q: "What's the mint fee?",
    a: 'A one-time $20 fee to deploy your agent on-chain. Your first agent is free.',
  },
  {
    q: 'What does "non-custodial" mean?',
    a: 'Non-custodial means we never hold your funds. Your assets remain in your own exchange accounts and wallets at all times. Cladex connects via read/trade API keys with no withdrawal permissions.',
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ Item Component                                                  */
/* ------------------------------------------------------------------ */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#1e1e2e] rounded-xl overflow-hidden transition-colors hover:border-[#2a2a3e]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left group"
      >
        <span className="text-gray-100 font-medium text-sm sm:text-base pr-4">{question}</span>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card Component                                              */
/* ------------------------------------------------------------------ */

function PricingCard({
  plan,
  annual,
}: {
  plan: Plan;
  annual: boolean;
}) {
  const iconColorMap: Record<string, string> = {
    ghost: 'text-emerald-400',
    blue: 'text-[#B8FF3C]',
    purple: 'text-purple-400',
  };

  const ctaClasses: Record<string, string> = {
    ghost: [
      'border border-[#1e1e2e] bg-transparent text-gray-300',
      'hover:bg-white/5 hover:border-gray-500 hover:text-white',
    ].join(' '),
    blue: [
      'bg-[#B8FF3C] text-black font-bold',
      'shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25',
      'hover:brightness-110',
    ].join(' '),
    purple: [
      'bg-[#B8FF3C] text-black font-bold',
      'shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25',
      'hover:brightness-110',
    ].join(' '),
  };

  // For Pro subscription, apply annual discount
  let displayPrice = plan.priceLabel;
  let displaySubLabel = plan.priceSubLabel;
  let billedNote: string | null = null;

  if (plan.isSubscription && annual) {
    const monthlyNum = parseInt(plan.priceLabel.replace('$', ''));
    const discounted = Math.round(monthlyNum * 0.8);
    displayPrice = `$${discounted}`;
    billedNote = `Billed $${discounted * 12}/year`;
  }

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border transition-all duration-300 ${
        plan.popular
          ? 'border-[#B8FF3C]/30 bg-[#111118] lg:scale-105 z-10'
          : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e]'
      } hover:-translate-y-1 ${plan.borderGlow} hover:shadow-xl`}
    >
      {/* Glow background */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${plan.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
      />

      {/* Most Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#B8FF3C]/10 text-[#B8FF3C] border border-[#B8FF3C]/30">
            <ZapIcon className="w-3 h-3" />
            Most Popular
          </span>
        </div>
      )}

      <div className="relative flex flex-col flex-1 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`${iconColorMap[plan.ctaStyle]}`}>
            {plan.icon}
          </div>
          <div>
            <h3 className="text-gray-100 font-semibold text-lg">{plan.name}</h3>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wider">{plan.tier}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            {plan.originalPrice && (
              <span className="text-gray-600 text-lg line-through">{plan.originalPrice}</span>
            )}
            <span className="text-4xl font-bold text-gray-100">{displayPrice}</span>
            <span className="text-gray-500 text-sm">{displaySubLabel}</span>
          </div>
          {billedNote && (
            <p className="text-gray-600 text-xs mt-1">{billedNote}</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[#1e1e2e] mb-6" />

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              {feature.included ? (
                <CheckIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <LockIcon className="w-4 h-4 text-gray-700 mt-0.5 shrink-0" />
              )}
              <span
                className={`text-sm leading-snug ${
                  feature.included ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href={plan.ctaHref}
          className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${ctaClasses[plan.ctaStyle]}`}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* ---- Hero ---- */}
      <section className="relative pt-20 pb-10 sm:pt-32 sm:pb-16 text-center px-4">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#B8FF3C]/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Deploy Your{' '}
            <span className="text-[#B8FF3C]">
              On-Chain Agents
            </span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Your first agent is free. Mint more for $20 each, or go Pro for unlimited deployments.
          </p>
        </div>
      </section>

      {/* ---- Billing Toggle (for Pro only) ---- */}
      <section className="flex justify-center items-center gap-4 pb-12 sm:pb-16 px-4">
        <span className={`text-sm font-medium transition-colors ${!annual ? 'text-gray-100' : 'text-gray-500'}`}>
          Monthly
        </span>

        <button
          onClick={() => setAnnual(!annual)}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
            annual ? 'bg-[#B8FF3C]' : 'bg-[#1e1e2e]'
          }`}
          aria-label="Toggle annual billing"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
              annual ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>

        <span className={`text-sm font-medium transition-colors ${annual ? 'text-gray-100' : 'text-gray-500'}`}>
          Annual
        </span>

        {annual && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 animate-in">
            Save 20% on Pro
          </span>
        )}
      </section>

      {/* ---- Pricing Cards ---- */}
      <section className="max-w-6xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-4 items-start">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} annual={annual} />
          ))}
        </div>
      </section>

      {/* ---- Trust Badges ---- */}
      <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            { icon: <ChainIcon className="w-5 h-5" />, label: 'Decentralized' },
            { icon: <ContractIcon className="w-5 h-5" />, label: 'Smart Contract Payments' },
            { icon: <NonCustodialIcon className="w-5 h-5" />, label: 'Non-Custodial' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-gray-500">
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="max-w-2xl mx-auto px-4 pb-16 sm:pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-100 mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="relative pb-24 sm:pb-32 text-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B8FF3C]/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">
            Your first agent is free. Deploy in 60 seconds.
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet and start trading with AI. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-[#B8FF3C] text-black shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 hover:brightness-110 transition-all duration-200"
          >
            Connect Wallet to Start
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
