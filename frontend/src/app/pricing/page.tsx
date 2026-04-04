'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                    */
/* ------------------------------------------------------------------ */

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function KeyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function SlidersIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function XCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
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

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

interface PricingPlan {
  name: string;
  price: string;
  label?: string;
  badge: string;
  badgeHighlight?: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaStyle: 'primary-green' | 'ghost' | 'primary' | 'ghost-purple';
  highlighted?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    badge: 'Start here',
    features: [
      '1 agent',
      'Basic strategies',
      'Demo + live mode',
      'Earns Cladex points',
    ],
    cta: 'Start Free',
    ctaHref: '/signup',
    ctaStyle: 'primary-green',
    highlighted: true,
  },
  {
    name: 'Deploy More',
    price: '$20',
    label: 'per additional agent',
    badge: 'One-time',
    features: [
      'Add agents one at a time',
      'All strategies available',
      'Full live trading',
    ],
    cta: 'Add Agent',
    ctaHref: '/signup',
    ctaStyle: 'ghost',
  },
  {
    name: 'Builder',
    price: '$80',
    label: 'one-time',
    badge: 'Popular',
    badgeHighlight: true,
    features: [
      'Up to 5 agents',
      'Marketplace access',
      'Earn from your agents',
      'Better visibility',
    ],
    cta: 'Get Builder',
    ctaHref: '/signup',
    ctaStyle: 'primary',
  },
  {
    name: 'Pro Creator',
    price: '$200',
    label: 'one-time',
    badge: 'Best value',
    features: [
      '10\u201315 agents',
      'Priority ranking',
      'Higher revenue share',
      'Advanced analytics',
      'Early feature access',
    ],
    cta: 'Go Pro',
    ctaHref: '/signup',
    ctaStyle: 'ghost-purple',
  },
];

const trustPoints = [
  { icon: ShieldIcon, label: 'Non-custodial', desc: 'We never hold your funds' },
  { icon: KeyIcon, label: 'Trade-only API', desc: 'Read and trade permissions only' },
  { icon: SlidersIcon, label: 'Full control', desc: 'Configure everything your way' },
  { icon: XCircleIcon, label: 'Cancel anytime', desc: 'Disconnect whenever you want' },
];

const faqs = [
  {
    q: 'Is Cladex free?',
    a: 'Yes, you get 1 free agent to start trading right away. No credit card required.',
  },
  {
    q: 'Are payments recurring?',
    a: 'No. All payments are one-time. You pay once and keep your agents forever.',
  },
  {
    q: 'Can I cancel?',
    a: 'You own your agents. Disconnect your exchange anytime and stop trading instantly.',
  },
  {
    q: 'Where are my funds?',
    a: 'On your exchange. We never hold funds. Cladex only uses trade-only API access.',
  },
];

/* ------------------------------------------------------------------ */
/*  CTA button styles                                                   */
/* ------------------------------------------------------------------ */

const ctaStyles: Record<PricingPlan['ctaStyle'], string> = {
  'primary-green': [
    'bg-[#B8FF3C] text-black font-bold',
    'shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25',
    'hover:brightness-110',
  ].join(' '),
  ghost: [
    'border border-[#1e1e2e] bg-transparent text-gray-300',
    'hover:bg-white/5 hover:border-gray-500 hover:text-white',
  ].join(' '),
  primary: [
    'bg-[#B8FF3C] text-black font-bold',
    'shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25',
    'hover:brightness-110',
  ].join(' '),
  'ghost-purple': [
    'border border-purple-500/30 bg-transparent text-purple-300',
    'hover:bg-purple-500/10 hover:border-purple-400/50 hover:text-purple-200',
  ].join(' '),
};

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
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-12 pb-10 sm:pt-20 sm:pb-16 text-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] sm:w-[500px] sm:h-[350px] lg:w-[800px] lg:h-[500px] bg-[#B8FF3C]/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Simple pricing
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Start free. Pay only when you need more agents.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-16 sm:pb-24 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`group relative flex flex-col rounded-2xl border transition-all duration-300 bg-[#111118] hover:-translate-y-1 hover:shadow-xl ${
                plan.highlighted
                  ? 'border-[#B8FF3C]/40 shadow-lg shadow-[#B8FF3C]/5'
                  : plan.badgeHighlight
                  ? 'border-[#B8FF3C]/20 hover:border-[#B8FF3C]/30'
                  : 'border-[#1e1e2e] hover:border-[#2a2a3e]'
              }`}
            >
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    plan.badgeHighlight
                      ? 'bg-[#B8FF3C]/15 text-[#B8FF3C] border border-[#B8FF3C]/30'
                      : plan.highlighted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  {plan.badge}
                </span>
              </div>

              <div className="relative flex flex-col flex-1 p-6 sm:p-7 pt-8">
                {/* Plan name */}
                <h3 className="text-gray-100 font-semibold text-lg mb-5">{plan.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-gray-100">{plan.price}</span>
                  </div>
                  {plan.label && (
                    <span className="text-gray-500 text-xs mt-1 block">{plan.label}</span>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-[#1e1e2e] mb-6" />

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm leading-snug text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${ctaStyles[plan.ctaStyle]}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-4xl mx-auto px-4 pb-16 sm:pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-100 mb-10">
          Your funds stay yours
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-3 p-4">
              <div className="text-[#B8FF3C]">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-gray-100 text-sm font-semibold">{label}</span>
              <span className="text-gray-500 text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
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

      {/* Footer disclaimer */}
      <footer className="border-t border-white/[0.06] py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 text-xs leading-relaxed">
            Cladex is not a financial advisor. Trading cryptocurrencies involves significant risk of loss.
            Past performance does not guarantee future results. Only trade with funds you can afford to lose.
          </p>
        </div>
      </footer>
    </div>
  );
}
