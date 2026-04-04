'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AgentAvatar } from '@/components/dashboard/AgentAvatar';
import { Logo } from '@/components/ui/Logo';

/* ── Scroll-reveal ──────────────────────────────────────────────── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('revealed');
          io.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rv ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Claw mark SVG (decorative background) ──────────────────────── */
function ClawMark({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width="120"
      height="144"
      viewBox="0 0 40 48"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute pointer-events-none ${className}`}
      style={style}
    >
      <rect x="2" y="6" width="6" height="22" rx="3" fill="url(#claw-grad)" />
      <rect x="13" y="2" width="6" height="32" rx="3" fill="url(#claw-grad)" />
      <rect x="24" y="10" width="6" height="16" rx="3" fill="url(#claw-grad)" />
      <path d="M5 28 Q5 36 2 41" stroke="url(#claw-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M16 34 Q16 42 13 46" stroke="url(#claw-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M27 26 Q27 34 24 38" stroke="url(#claw-grad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="claw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B8FF3C" />
          <stop offset="100%" stopColor="#6aa61c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Arrow icon ─────────────────────────────────────────────────── */
const Arrow = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

/* ── Agent data ─────────────────────────────────────────────────── */
const AGENTS = [
  { name: 'Apex', personality: 'apex' as const, title: 'Momentum Trader', description: 'Executes high-speed breakout trades', color: 'border-red-500' },
  { name: 'Nova', personality: 'nova' as const, title: 'Risk Manager', description: 'Focuses on capital protection and low drawdown', color: 'border-emerald-500' },
  { name: 'Echo', personality: 'echo' as const, title: 'Predictive Analyst', description: 'Identifies patterns and market signals', color: 'border-violet-500' },
  { name: 'Sage', personality: 'sage' as const, title: 'Technical Strategist', description: 'Uses data-driven analysis to guide trades', color: 'border-cyan-500' },
];

/* ── Live activity feed data ────────────────────────────────────── */
const LIVE_FEED = [
  { agent: 'apex' as const, name: 'Apex', action: 'Entered SOL breakout at $148', result: '+$127', resultColor: 'text-emerald-400' },
  { agent: 'echo' as const, name: 'Echo', action: 'Momentum confirmed. Monitoring ETH', result: '+$84', resultColor: 'text-emerald-400' },
  { agent: 'nova' as const, name: 'Nova', action: 'Risk adjusted. Exposure reduced', result: '', resultColor: '' },
  { agent: 'sage' as const, name: 'Sage', action: 'BTC correlation analysis complete', result: 'Watching', resultColor: 'text-gray-400' },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ── Global styles ──────────────────────────────────────── */}
      <style jsx global>{`
        .rv {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .rv.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -18px) scale(1.05); }
          66% { transform: translate(-8px, 12px) scale(0.95); }
        }
        .orb {
          animation: float-orb 12s ease-in-out infinite;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-pulse {
          animation: pulse-live 1.5s ease-in-out infinite;
        }
        .green-glow {
          box-shadow: 0 0 20px rgba(184, 255, 60, 0.15), 0 0 60px rgba(184, 255, 60, 0.05);
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.06; transform: scale(1); }
          50% { opacity: 0.1; transform: scale(1.04); }
        }
        .claw-breathe {
          animation: breathe 5s ease-in-out infinite;
        }
        .green-glow-hover:hover {
          box-shadow: 0 0 30px rgba(184, 255, 60, 0.25), 0 0 80px rgba(184, 255, 60, 0.1);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fade-in-up 0.5s ease-out both;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════
         1. NAVBAR
         ═══════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#1e1e2e]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#agents" className="text-sm text-gray-400 hover:text-white transition-colors">
              Agents
            </Link>
            <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Log In
            </Link>
            <Link
              href="/signup"
              className="bg-[#B8FF3C] text-black font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-110 transition-all green-glow-hover"
            >
              Launch Free Agent
            </Link>
          </div>

          {/* Mobile: hamburger + CTA */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/signup"
              className="bg-[#B8FF3C] text-black font-semibold text-xs px-4 py-2 rounded-lg"
            >
              Launch Free Agent
            </Link>
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400"
            >
              {mobileMenu ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenu && (
          <div className="md:hidden border-t border-[#1e1e2e]/60 bg-[#0a0a0f]/95 backdrop-blur-xl px-4 py-3 space-y-2">
            <Link href="#how-it-works" onClick={() => setMobileMenu(false)} className="block py-2 text-sm text-gray-400 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#agents" onClick={() => setMobileMenu(false)} className="block py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Agents
            </Link>
            <Link href="#pricing" onClick={() => setMobileMenu(false)} className="block py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login" onClick={() => setMobileMenu(false)} className="block py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Log In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenu(false)}
              className="block w-full text-center bg-[#B8FF3C] text-black font-semibold text-sm px-5 py-2.5 rounded-lg hover:brightness-110 transition-all mt-2"
            >
              Launch Free Agent
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════
         2. HERO
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Claw marks */}
        <ClawMark className="claw-breathe" style={{ top: '8%', left: '5%', opacity: 0.07, transform: 'rotate(-15deg) scale(1.8)' }} />
        <ClawMark className="claw-breathe" style={{ top: '20%', right: '8%', opacity: 0.09, transform: 'rotate(25deg) scale(2.2)', animationDelay: '1s' }} />
        <ClawMark className="claw-breathe" style={{ bottom: '15%', left: '15%', opacity: 0.06, transform: 'rotate(-40deg) scale(1.4)', animationDelay: '2s' }} />
        <ClawMark className="claw-breathe" style={{ bottom: '10%', right: '12%', opacity: 0.08, transform: 'rotate(10deg) scale(2.5)', animationDelay: '3s' }} />
        <ClawMark className="claw-breathe" style={{ top: '45%', left: '60%', opacity: 0.05, transform: 'rotate(-60deg) scale(1.2)', animationDelay: '1.5s' }} />
        {/* Background gradient orbs */}
        <div className="orb absolute top-1/4 left-1/4 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] rounded-full bg-[#B8FF3C]/[0.06] blur-[120px]" />
        <div className="orb absolute bottom-1/3 right-1/4 w-[175px] h-[175px] sm:w-[250px] sm:h-[250px] lg:w-[350px] lg:h-[350px] rounded-full bg-[#B8FF3C]/[0.04] blur-[100px]" style={{ animationDelay: '4s' }} />
        <div className="orb absolute top-1/2 right-1/3 w-[150px] h-[150px] sm:w-[220px] sm:h-[220px] lg:w-[300px] lg:h-[300px] rounded-full bg-emerald-500/[0.04] blur-[110px]" style={{ animationDelay: '8s' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <Reveal>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">
                Autonomous AI agents that{' '}
                <span className="bg-gradient-to-r from-[#B8FF3C] to-[#6aa61c] bg-clip-text text-transparent">
                  trade crypto
                </span>{' '}
                for you
              </h1>
            </Reveal>

            <Reveal delay={100}>
              <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-lg">
                Connect your exchange. Deploy an agent. It executes trades 24/7 with built-in risk control.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span>Non-custodial</span>
                <span>&middot;</span>
                <span>Trade-only API</span>
                <span>&middot;</span>
                <span>Withdrawals disabled</span>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-block bg-[#B8FF3C] text-black font-bold text-base px-8 py-3.5 rounded-xl hover:brightness-110 transition-all green-glow green-glow-hover"
                >
                  Launch Your Free Agent
                </Link>
                <Link
                  href="/dashboard/marketplace"
                  className="inline-flex items-center gap-2 text-gray-300 font-medium text-sm px-6 py-3.5 rounded-xl border border-[#1e1e2e] hover:border-[#2a2a3e] hover:text-white transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 live-pulse" />
                  Watch Live Trading
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Right: mock dashboard card */}
          <Reveal delay={300}>
            <div className="rounded-2xl bg-[#111118] border border-[#1e1e2e] p-6 sm:p-8 relative overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 live-pulse" />
                  <span className="text-sm text-gray-400 font-medium">Live Trading</span>
                </div>
                <span className="text-xs text-gray-600">Updated just now</span>
              </div>

              {/* Trade notifications */}
              <div className="space-y-3">
                <div className="fade-in-up flex items-center justify-between rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-3" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    <span className="text-sm text-gray-200">BTC trade closed</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">+$124.50</span>
                </div>

                <div className="fade-in-up flex items-center justify-between rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-3" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    <span className="text-sm text-gray-200">ETH scalp executed</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">+$87.20</span>
                </div>

                <div className="fade-in-up flex items-center justify-between rounded-xl bg-white/[0.03] border border-[#1e1e2e] px-4 py-3" style={{ animationDelay: '1.5s' }}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <span className="text-sm text-gray-400">Risk adjusted. Exposure reduced.</span>
                  </div>
                </div>
              </div>

              {/* Subtle glow */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-[#B8FF3C]/[0.04] blur-[60px] pointer-events-none" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         3. LIVE ACTIVITY
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 live-pulse" />
                <span className="text-sm text-gray-400 font-medium">Live</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                Live Agent Activity
              </h2>
            </div>
          </Reveal>

          <div className="max-w-2xl mx-auto space-y-3">
            {LIVE_FEED.map((entry, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="flex items-center gap-4 rounded-xl bg-[#111118] border border-[#1e1e2e] px-4 sm:px-5 py-4 hover:border-[#2a2a3e] transition-colors">
                  <AgentAvatar personality={entry.agent} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{entry.name}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{entry.action}</p>
                  </div>
                  {entry.result && (
                    <span className={`text-sm font-semibold shrink-0 ${entry.resultColor}`}>
                      {entry.result}
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         4. HOW IT WORKS
         ═══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4">
              Start in under 60 seconds
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: 1,
                title: 'Connect Your Exchange',
                desc: 'Securely link Binance, Bybit, or other supported exchanges using trade-only API access.',
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 7L12 2L22 7L12 12L2 7Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                ),
              },
              {
                step: 2,
                title: 'Deploy an AI Agent',
                desc: 'Choose a strategy or describe your goal. Your agent starts analyzing markets instantly.',
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                    <path d="M7 20l2-3h6l2 3" />
                  </svg>
                ),
              },
              {
                step: 3,
                title: 'Let It Trade',
                desc: 'Your agent executes trades 24/7 while you monitor, pause, or adjust anytime.',
                icon: (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 120}>
                <div className="relative rounded-2xl bg-[#111118] border border-[#1e1e2e] p-6 sm:p-8 group hover:border-[#B8FF3C]/20 transition-all duration-300">
                  {/* Step number circle */}
                  <div className="w-10 h-10 rounded-full bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center text-[#B8FF3C] font-bold text-sm mb-5">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center text-[#B8FF3C] mb-5">
                    {item.icon}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         5. TRUST SECTION
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-14">
              Built for real trading
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                title: 'Risk Engine',
                desc: 'Every trade follows strict risk controls to protect your capital.',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
              },
              {
                title: 'Non-Custodial',
                desc: 'Your funds never leave your exchange.',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                ),
              },
              {
                title: 'Real Execution',
                desc: 'Trades are executed live via exchange APIs.',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
              },
              {
                title: 'Full Control',
                desc: 'Pause, stop, or disconnect anytime.',
                icon: (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
                    <circle cx="16" cy="12" r="3" />
                  </svg>
                ),
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div className="rounded-2xl bg-[#111118] border border-[#1e1e2e] p-6 hover:border-[#2a2a3e] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#B8FF3C]/10 border border-[#B8FF3C]/20 flex items-center justify-center text-[#B8FF3C] mb-4">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         6. AGENTS
         ═══════════════════════════════════════════════════════════ */}
      <section id="agents" className="relative py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-14">
              Intelligent trading agents
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {AGENTS.map((agent, i) => (
              <Reveal key={agent.name} delay={i * 100}>
                <div className={`rounded-2xl bg-[#111118] border border-[#1e1e2e] border-t-2 ${agent.color} p-5 sm:p-6 group hover:border-[#B8FF3C]/30 transition-all`}>
                  <div className="flex flex-col items-center text-center">
                    <AgentAvatar personality={agent.personality} size={64} />
                    <h3 className="mt-3 font-bold text-lg">{agent.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{agent.title}</p>
                    <p className="mt-3 text-sm text-gray-400">{agent.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={450}>
            <div className="mt-10 text-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-[#B8FF3C] font-semibold hover:underline"
              >
                Deploy your first agent <Arrow />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         7. SOCIAL PROOF
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                { value: '4,258', label: 'agents active' },
                { value: '$2.4M', label: 'traded today' },
                { value: '1,391', label: 'watching live' },
              ].map((stat, i) => (
                <div key={i} className="text-center rounded-2xl bg-[#111118] border border-[#1e1e2e] py-8 px-4">
                  <span className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</span>
                  <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         8. PRICING
         ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-20 sm:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-14">
              Simple pricing
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {[
              {
                name: 'Free',
                price: '$0',
                desc: 'Get started instantly',
                features: ['1 agent', 'Basic strategies', 'Demo + live mode', 'Earns Cladex points'],
                featured: true,
                cta: 'Start Free',
                ctaStyle: 'bg-[#B8FF3C] text-black hover:brightness-110 shadow-lg shadow-[#B8FF3C]/15',
              },
              {
                name: 'Deploy More',
                price: '$20',
                desc: 'Per additional agent',
                features: ['Add extra agents', 'One-time payment each', 'Same strategies', 'Same live + demo access'],
                featured: false,
                cta: 'Add Agent',
                ctaStyle: 'bg-white/[0.06] text-gray-300 border border-[#1e1e2e] hover:bg-white/[0.1] hover:text-white',
              },
              {
                name: 'Builder',
                price: '$80',
                desc: 'One-time payment',
                features: ['Up to 5 agents', 'Marketplace access', 'Earn from agents', 'Better visibility'],
                featured: false,
                cta: 'Get Builder',
                ctaStyle: 'bg-white/[0.06] text-gray-300 border border-[#1e1e2e] hover:bg-white/[0.1] hover:text-white',
              },
              {
                name: 'Pro Creator',
                price: '$200',
                desc: 'One-time payment',
                features: ['10-15 agents', 'Priority ranking', 'Higher revenue share', 'Advanced analytics'],
                featured: false,
                cta: 'Go Pro',
                ctaStyle: 'bg-white/[0.06] text-gray-300 border border-purple-500/30 hover:bg-white/[0.1] hover:text-white hover:border-purple-500/50',
              },
            ].map((plan, idx) => (
              <Reveal key={plan.name} delay={100 + idx * 100}>
                <div className={`relative rounded-2xl bg-[#111118] border ${plan.featured ? 'border-[#B8FF3C]/30 green-glow' : 'border-[#1e1e2e]'} p-6 sm:p-8 hover:border-[#B8FF3C]/40 transition-all`}>
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold bg-[#B8FF3C]/10 text-[#B8FF3C] border border-[#B8FF3C]/30">
                        Default
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="block text-xs text-gray-500 mt-1">{plan.desc}</span>
                  </div>
                  <ul className="space-y-2.5 text-sm text-gray-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0 text-[#B8FF3C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 inline-block w-full text-center font-bold text-sm px-6 py-3 rounded-xl transition-all ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         9. FINAL CTA
         ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 border-t border-[#1e1e2e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8">
              The future of trading is autonomous.
              <br />
              <span className="text-gray-400">Be early.</span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <Link
              href="/signup"
              className="inline-block bg-[#B8FF3C] text-black font-bold text-lg px-10 py-4 rounded-xl hover:brightness-110 transition-all green-glow green-glow-hover"
            >
              Launch Your Free Agent
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         10. FOOTER
         ═══════════════════════════════════════════════════════════ */}
      <footer className="relative py-12 border-t border-[#1e1e2e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Logo size="sm" />
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
                <Link href="/docs" className="hover:text-gray-300 transition-colors">Docs</Link>
              </div>
            </div>
            <p className="mt-6 text-xs text-gray-600 max-w-lg mx-auto text-center">
              Cladex does not hold user funds. All trading is executed via connected exchanges using trade-only API access. Withdrawals are never enabled.
            </p>
            <p className="mt-2 text-xs text-gray-600 max-w-lg mx-auto text-center">
              Trading involves risk. Past performance does not guarantee future results. This is not financial advice.
            </p>
            <p className="mt-4 text-xs text-gray-700 text-center">
              &copy; 2026 Cladex
            </p>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}
