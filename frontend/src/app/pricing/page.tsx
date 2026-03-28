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

function KeyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
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

function ChainIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

interface DeploymentPlan {
  name: string;
  icon: React.ReactNode;
  price: string;
  features: string[];
  cta: string;
  ctaHref: string;
  ctaStyle: 'ghost' | 'primary' | 'purple';
  popular: boolean;
  iconColor: string;
  glowColor: string;
  borderGlow: string;
}

const deploymentPlans: DeploymentPlan[] = [
  {
    name: 'Trader',
    icon: <ZapIcon className="w-6 h-6" />,
    price: '$25',
    features: [
      'Deploy up to 2 agents',
      'Basic AI model',
      'Limited visibility',
      'Airdrop eligible',
      'Base points',
    ],
    cta: 'Get Trader',
    ctaHref: '/signup?plan=trader',
    ctaStyle: 'ghost',
    popular: false,
    iconColor: 'text-gray-400',
    glowColor: 'from-emerald-500/10 to-emerald-500/0',
    borderGlow: 'group-hover:shadow-emerald-500/20',
  },
  {
    name: 'Builder',
    icon: <ZapIcon className="w-6 h-6" />,
    price: '$80',
    features: [
      'Deploy up to 5 agents',
      'Deploy & Earn',
      'Smarter AI model',
      'Marketplace visibility boost',
      'Basic analytics',
      'Higher airdrop eligibility',
      'Bonus points',
    ],
    cta: 'Get Builder',
    ctaHref: '/signup?plan=builder',
    ctaStyle: 'primary',
    popular: true,
    iconColor: 'text-[#B8FF3C]',
    glowColor: 'from-[#B8FF3C]/10 to-[#B8FF3C]/0',
    borderGlow: 'group-hover:shadow-[#B8FF3C]/15',
  },
  {
    name: 'Pro Creator',
    icon: <CrownIcon className="w-6 h-6" />,
    price: '$200',
    features: [
      'Deploy 10\u201315 agents',
      'Premium AI models',
      'Priority ranking',
      'Featured placement',
      'Higher revenue share',
      'Advanced analytics',
      'Max airdrop eligibility',
      'Premium points',
    ],
    cta: 'Get Pro Creator',
    ctaHref: '/signup?plan=pro-creator',
    ctaStyle: 'purple',
    popular: false,
    iconColor: 'text-purple-400',
    glowColor: 'from-purple-500/10 to-purple-500/0',
    borderGlow: 'group-hover:shadow-purple-500/20',
  },
];

interface SubscriptionPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  badge: string;
  badgeColor: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    name: 'Starter',
    price: '$5',
    period: '/mo',
    features: [
      'Manual/guided AI trading',
      'Basic Agent Comm',
      'Normal execution',
    ],
    badge: '\u26aa Grey badge',
    badgeColor: 'text-gray-400',
    cta: 'Subscribe',
    ctaHref: '/signup?plan=starter-sub',
    featured: false,
  },
  {
    name: 'Core',
    price: '$15',
    period: '/mo',
    features: [
      'Full automation (24/7)',
      'Real-time execution',
      'Full Agent Comm',
      'Standard analytics',
    ],
    badge: '\ud83d\udfe2 Blue Verified badge',
    badgeColor: 'text-blue-400',
    cta: 'Subscribe',
    ctaHref: '/signup?plan=core-sub',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$35',
    period: '/mo',
    features: [
      'Faster execution',
      'Advanced analytics',
      'Smarter AI layer',
      'Enhanced insights',
    ],
    badge: '\ud83d\udfe3 Purple Verified+ badge',
    badgeColor: 'text-purple-400',
    cta: 'Subscribe',
    ctaHref: '/signup?plan=pro-sub',
    featured: false,
  },
  {
    name: 'Elite',
    price: '$79',
    period: '/mo',
    features: [
      'Highest execution priority',
      'Premium AI models',
      'Risk control tools',
      'Dedicated support',
      'Beta features',
    ],
    badge: '\ud83d\udfe1 Gold Verified badge',
    badgeColor: 'text-yellow-400',
    cta: 'Subscribe',
    ctaHref: '/signup?plan=elite-sub',
    featured: false,
  },
];

interface ComboDeal {
  name: string;
  price: string;
  features: string[];
  cta: string;
  bestValue: boolean;
}

const comboDeals: ComboDeal[] = [
  {
    name: 'Starter Combo',
    price: '$39',
    features: [
      'Trader deployment (2 agents)',
      '3 months Core subscription',
    ],
    cta: 'Get Combo',
    bestValue: false,
  },
  {
    name: 'Builder Combo',
    price: '$129',
    features: [
      'Builder deployment (5 agents)',
      '6 months Core subscription',
      'Blue Verified included',
    ],
    cta: 'Get Combo',
    bestValue: true,
  },
  {
    name: 'Pro Combo',
    price: '$299',
    features: [
      'Pro Creator deployment',
      '12 months Pro subscription',
      'Purple Verified+ included',
    ],
    cta: 'Get Combo',
    bestValue: false,
  },
];

const badgeLevels = [
  { emoji: '\u26aa', tier: 'Basic (Grey)', label: 'Unverified' },
  { emoji: '\ud83d\udfe2', tier: 'Starter (Green)', label: 'Active' },
  { emoji: '\ud83d\udfe2', tier: 'Core (Blue)', label: 'Verified' },
  { emoji: '\ud83d\udfe3', tier: 'Pro (Purple)', label: 'Verified+' },
  { emoji: '\ud83d\udfe1', tier: 'Elite (Gold)', label: 'Top Tier' },
];

const faqs = [
  {
    q: 'Do I need a subscription to trade?',
    a: 'No. Deploy an agent and trade manually. Subscription unlocks automation, speed, and verified badges.',
  },
  {
    q: 'What are verification badges?',
    a: 'Badges show your subscription level. Blue = Verified, Purple = Verified+, Gold = Top Tier. Higher badges = more trust in the marketplace.',
  },
  {
    q: 'What exchanges are supported?',
    a: 'Bybit, Binance, and more coming soon.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel subscription or disconnect exchange anytime.',
  },
  {
    q: 'What is airdrop eligibility?',
    a: 'All deployment plans are eligible for future token airdrops. Higher plans get higher allocation.',
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
/*  Section Header Component                                            */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">{title}</h2>
      <p className="text-gray-400 text-base">{subtitle}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const deployCta: Record<string, string> = {
    ghost: [
      'border border-[#1e1e2e] bg-transparent text-gray-300',
      'hover:bg-white/5 hover:border-gray-500 hover:text-white',
    ].join(' '),
    primary: [
      'bg-[#B8FF3C] text-black font-bold',
      'shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25',
      'hover:brightness-110',
    ].join(' '),
    purple: [
      'bg-purple-600 text-white font-bold',
      'shadow-lg shadow-purple-600/15 hover:shadow-purple-600/25',
      'hover:brightness-110',
    ].join(' '),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* ---- Hero ---- */}
      <section className="relative pt-20 pb-10 sm:pt-32 sm:pb-16 text-center px-4">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] sm:w-[500px] sm:h-[350px] lg:w-[800px] lg:h-[500px] bg-[#B8FF3C]/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="text-[#B8FF3C]">Choose Your Plan</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Deploy agents with a one-time fee. Upgrade with a subscription for automation, speed, and trust.
          </p>
        </div>
      </section>

      {/* ---- Section 1: Deployment Plans ---- */}
      <section className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24 pt-8">
        <SectionHeader title="Deployment Plans" subtitle="One-time payment to deploy your agents" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {deploymentPlans.map((plan) => (
            <div
              key={plan.name}
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
                  <div className={plan.iconColor}>{plan.icon}</div>
                  <h3 className="text-gray-100 font-semibold text-lg">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-100">{plan.price}</span>
                    <span className="text-gray-500 text-sm">one-time</span>
                  </div>
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
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${deployCta[plan.ctaStyle]}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Section 2: Subscription Plans ---- */}
      <section className="max-w-6xl mx-auto px-4 pb-16 sm:pb-24">
        <SectionHeader title="Subscription Plans" subtitle="Unlock automation, speed, and verified status" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.name}
              className={`group relative flex flex-col rounded-2xl border transition-all duration-300 ${
                plan.featured
                  ? 'border-[#B8FF3C]/30 bg-[#111118] lg:scale-105 z-10'
                  : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e]'
              } hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Featured badge */}
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#B8FF3C]/10 text-[#B8FF3C] border border-[#B8FF3C]/30">
                    <ZapIcon className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="relative flex flex-col flex-1 p-6">
                {/* Header */}
                <h3 className="text-gray-100 font-semibold text-lg mb-4">{plan.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-100">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#1e1e2e] mb-4" />

                {/* Features */}
                <ul className="space-y-2.5 mb-4 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm leading-snug text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Badge */}
                <div className={`text-sm font-medium mb-6 ${plan.badgeColor}`}>
                  {plan.badge}
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.featured
                      ? 'bg-[#B8FF3C] text-black font-bold shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 hover:brightness-110'
                      : 'border border-[#1e1e2e] bg-transparent text-gray-300 hover:bg-white/5 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Section 3: Combo Deals ---- */}
      <section className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <SectionHeader title="Combo Deals" subtitle="Best value \u2014 deploy + subscribe in one package" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {comboDeals.map((combo) => (
            <div
              key={combo.name}
              className={`group relative flex flex-col rounded-2xl border transition-all duration-300 ${
                combo.bestValue
                  ? 'border-[#B8FF3C]/30 bg-[#111118] lg:scale-105 z-10'
                  : 'border-[#1e1e2e] bg-[#111118] hover:border-[#2a2a3e]'
              } hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Best Value badge */}
              {combo.bestValue && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#B8FF3C]/10 text-[#B8FF3C] border border-[#B8FF3C]/30">
                    <ZapIcon className="w-3 h-3" />
                    Best Value
                  </span>
                </div>
              )}

              <div className="relative flex flex-col flex-1 p-6 sm:p-8">
                {/* Header */}
                <h3 className="text-gray-100 font-semibold text-lg mb-4">{combo.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-100">{combo.price}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#1e1e2e] mb-6" />

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {combo.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-sm leading-snug text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/signup"
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    combo.bestValue
                      ? 'bg-[#B8FF3C] text-black font-bold shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 hover:brightness-110'
                      : 'border border-[#1e1e2e] bg-transparent text-gray-300 hover:bg-white/5 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {combo.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Badge Legend ---- */}
      <section className="max-w-4xl mx-auto px-4 pb-16 sm:pb-24">
        <h3 className="text-lg font-semibold text-gray-100 text-center mb-6">Badge Levels</h3>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {badgeLevels.map((badge) => (
            <div key={badge.tier} className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-2xl">{badge.emoji}</span>
              <span className="text-gray-300 text-xs font-semibold">{badge.tier}</span>
              <span className="text-gray-500 text-xs">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Trust Section ---- */}
      <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-100 mb-10">
          Your funds stay yours
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <ShieldIcon className="w-6 h-6" />, label: 'Non-custodial', desc: 'Cladex never holds funds' },
            { icon: <KeyIcon className="w-6 h-6" />, label: 'Trade-only API access', desc: 'Read and trade permissions only' },
            { icon: <LockIcon className="w-6 h-6" />, label: 'Withdrawals disabled', desc: 'No withdrawal permissions ever' },
            { icon: <ChainIcon className="w-6 h-6" />, label: 'Disconnect anytime', desc: 'Revoke access whenever you want' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-3 p-4">
              <div className="text-[#B8FF3C]">{icon}</div>
              <span className="text-gray-100 text-sm font-semibold">{label}</span>
              <span className="text-gray-500 text-xs">{desc}</span>
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
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[250px] h-[150px] sm:w-[400px] sm:h-[200px] lg:w-[600px] lg:h-[300px] bg-[#B8FF3C]/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-3">
            Start with a deployment plan. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-gray-400 mb-8">
            Deploy your first agent today.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-[#B8FF3C] text-black shadow-lg shadow-[#B8FF3C]/15 hover:shadow-[#B8FF3C]/25 hover:brightness-110 transition-all duration-200"
          >
            Get Early Access
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
