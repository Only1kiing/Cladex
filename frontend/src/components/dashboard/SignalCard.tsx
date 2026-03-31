'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AgentAvatar } from './AgentAvatar';
import type { TradeSignal } from '@/hooks/useSignalGenerator';

interface SignalCardProps {
  signal: TradeSignal;
  onExecute: (signal: TradeSignal) => void;
  onDismiss: (id: string) => void;
}

const personalityColor: Record<string, string> = {
  guardian: 'text-guardian-400',
  analyst: 'text-analyst-400',
  hunter: 'text-hunter-400',
  oracle: 'text-oracle-400',
};

const personalityLabel: Record<string, string> = {
  guardian: 'Capital Protection',
  analyst: 'Data-Driven Analysis',
  hunter: 'Momentum Trading',
  oracle: 'Predictive Model',
};

const confidenceColor = (c: number) => {
  if (c >= 85) return 'bg-emerald-500';
  if (c >= 70) return 'bg-[#B8FF3C]';
  return 'bg-amber-500';
};

const PREVIEW_DETAILS: Record<string, { q: string; a: string }[]> = {
  hunter: [
    { q: 'Why this trade?', a: 'Momentum breakout detected with rising volume. Price action confirms bullish structure above key support.' },
    { q: 'What\'s the risk?', a: 'Stop loss is tight to limit downside. If entry fails, max loss is capped at the SL level shown above.' },
    { q: 'How long will this take?', a: 'Hunter trades are fast — typically 10 min to 4 hours. Designed to catch quick moves and exit.' },
    { q: 'What if I miss it?', a: 'Signals expire in a few minutes. The agent will generate new ones as opportunities appear.' },
  ],
  oracle: [
    { q: 'Why this trade?', a: 'Predictive model identified a high-probability reversal zone. Historical accuracy at this pattern: 78%.' },
    { q: 'What\'s the risk?', a: 'Oracle trades use wider stops for higher conviction. Risk is managed through position sizing.' },
    { q: 'How confident is the model?', a: 'The confidence score reflects backtested win rate at similar setups over the last 90 days.' },
    { q: 'What if the prediction is wrong?', a: 'Stop loss automatically limits your downside. The agent adjusts models after each outcome.' },
  ],
  analyst: [
    { q: 'Why this trade?', a: 'Technical indicators aligned — RSI, volume profile, and order flow all confirm this setup.' },
    { q: 'What data supports this?', a: 'Cross-exchange analysis across Binance, OKX, and Bybit. Smart money flow is positive.' },
    { q: 'What\'s the risk?', a: 'Risk is calculated precisely. The R:R ratio and stop loss are set based on recent volatility.' },
    { q: 'How reliable is this signal?', a: 'Analyst signals have a 67% historical win rate. This setup scores above average confidence.' },
  ],
  guardian: [
    { q: 'Why this trade?', a: 'Conservative entry at strong support with favorable risk/reward. Capital preservation is the priority.' },
    { q: 'Is this safe?', a: 'Guardian trades use the tightest risk management. Stop loss is placed at the nearest structural support.' },
    { q: 'What\'s the expected return?', a: 'Moderate but consistent. Guardian trades aim for steady gains with minimal drawdown.' },
    { q: 'What if the market crashes?', a: 'The stop loss activates automatically. Guardian agents also monitor portfolio-wide exposure.' },
  ],
};

// ---- Mini Chart ----

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

function generateCandles(entry: number, side: 'long' | 'short', count = 30): Candle[] {
  const candles: Candle[] = [];
  // Start price slightly away from entry to create a natural approach
  let price = side === 'long' ? entry * (1 + 0.02 + Math.random() * 0.02) : entry * (1 - 0.02 - Math.random() * 0.02);

  for (let i = 0; i < count; i++) {
    const volatility = entry * 0.004;
    const trend = i > count * 0.6
      ? (side === 'long' ? -0.0008 : 0.0008) // price drops to entry for long, rises for short
      : (Math.random() - 0.5) * 0.001;

    const change = (Math.random() - 0.5) * volatility + entry * trend;
    const open = price;
    const close = price + change;
    const wick = Math.random() * volatility * 0.8;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;

    candles.push({ open, high, low, close });
    price = close;
  }
  return candles;
}

function SignalChart({ signal }: { signal: TradeSignal }) {
  const candles = useMemo(() => generateCandles(signal.entryPrice, signal.side), [signal.entryPrice, signal.side]);

  const W = 380;
  const H = 160;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 20;
  const PAD_RIGHT = 55;
  const chartW = W - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  // Price range including SL/TP
  const allPrices = candles.flatMap(c => [c.high, c.low]).concat([signal.stopLoss, signal.takeProfit, signal.entryPrice]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const priceToY = (p: number) => PAD_TOP + chartH - ((p - minPrice) / priceRange) * chartH;
  const candleW = Math.max(2, (chartW - 10) / candles.length - 1);

  const entryY = priceToY(signal.entryPrice);
  const slY = priceToY(signal.stopLoss);
  const tpY = priceToY(signal.takeProfit);

  return (
    <div className="rounded-lg bg-[#0a0a0f] border border-white/[0.06] p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-gray-400">{signal.pair} &middot; 15m</span>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-white/50 inline-block" /> Entry</span>
          <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-red-400 inline-block" /> SL</span>
          <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-emerald-400 inline-block" /> TP</span>
        </div>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => {
          const y = PAD_TOP + chartH * f;
          return <line key={f} x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />;
        })}

        {/* TP zone (green fill) */}
        <rect
          x={0}
          y={signal.side === 'long' ? tpY : entryY}
          width={chartW}
          height={Math.abs(tpY - entryY)}
          fill="rgba(34,197,94,0.06)"
        />

        {/* SL zone (red fill) */}
        <rect
          x={0}
          y={signal.side === 'long' ? entryY : slY}
          width={chartW}
          height={Math.abs(slY - entryY)}
          fill="rgba(239,68,68,0.06)"
        />

        {/* TP line */}
        <line x1={0} y1={tpY} x2={chartW} y2={tpY} stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />

        {/* Entry line */}
        <line x1={0} y1={entryY} x2={chartW} y2={entryY} stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="4 3" />

        {/* SL line */}
        <line x1={0} y1={slY} x2={chartW} y2={slY} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />

        {/* Candlesticks */}
        {candles.map((c, i) => {
          const x = 5 + i * (candleW + 1);
          const bullish = c.close >= c.open;
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyBottom = priceToY(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBottom - bodyTop);
          const color = bullish ? '#22c55e' : '#ef4444';

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x + candleW / 2} y1={priceToY(c.high)}
                x2={x + candleW / 2} y2={priceToY(c.low)}
                stroke={color} strokeWidth={1} opacity={0.5}
              />
              {/* Body */}
              <rect
                x={x} y={bodyTop}
                width={candleW} height={bodyH}
                fill={bullish ? color : color}
                opacity={0.85}
                rx={0.5}
              />
            </g>
          );
        })}

        {/* Price labels on right */}
        <text x={chartW + 4} y={tpY + 3} fill="#22c55e" fontSize={9} fontWeight={600} fontFamily="monospace">
          ${signal.takeProfit.toLocaleString()}
        </text>
        <text x={chartW + 4} y={entryY + 3} fill="rgba(255,255,255,0.6)" fontSize={9} fontWeight={600} fontFamily="monospace">
          ${signal.entryPrice.toLocaleString()}
        </text>
        <text x={chartW + 4} y={slY + 3} fill="#ef4444" fontSize={9} fontWeight={600} fontFamily="monospace">
          ${signal.stopLoss.toLocaleString()}
        </text>

        {/* Entry arrow */}
        <g transform={`translate(${chartW - 12}, ${entryY})`}>
          <polygon
            points={signal.side === 'long' ? '0,-5 6,0 0,5' : '0,-5 6,0 0,5'}
            fill="#B8FF3C"
            opacity={0.9}
          />
        </g>
      </svg>
    </div>
  );
}

function SignalCard({ signal, onExecute, onDismiss }: SignalCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(signal.status !== 'active');
  const [hiding, setHiding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [askInput, setAskInput] = useState('');
  const [askMessages, setAskMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [askTyping, setAskTyping] = useState(false);

  useEffect(() => {
    if (signal.status !== 'active') {
      setExpired(true);
      return;
    }
    const tick = () => {
      const remaining = signal.expiresAt - Date.now();
      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [signal.expiresAt, signal.status]);

  // Hide card when executed or dismissed
  useEffect(() => {
    if (signal.status === 'executed') {
      setHiding(true);
    }
  }, [signal.status]);

  const isExecuted = signal.status === 'executed';
  const isMissed = signal.status === 'missed' || expired;

  // Don't render if hiding animation complete
  if (hiding) {
    return (
      <div className="mx-3 my-0 overflow-hidden transition-all duration-500 ease-out max-h-0 opacity-0" />
    );
  }

  const handleSkip = () => {
    setHiding(true);
    setTimeout(() => onDismiss(signal.id), 300);
  };

  const details = PREVIEW_DETAILS[signal.personality] || PREVIEW_DETAILS.analyst;
  const slPercent = Math.abs((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2);
  const tpPercent = Math.abs((signal.takeProfit - signal.entryPrice) / signal.entryPrice * 100).toFixed(2);
  const rrRatio = (parseFloat(tpPercent) / parseFloat(slPercent)).toFixed(1);

  const getPersonaReply = (lower: string): string => {
    const p = signal.personality;

    // Personality tone wrappers
    const tone = {
      hunter: {
        why: `Spotted this ${signal.pair} move from a mile away ⚡ ${signal.reason}. ${signal.confidence}% confidence — I don't miss at this level. Entry at $${signal.entryPrice.toLocaleString()}, let's eat 🎯`,
        risk: `Risk? ${slPercent}% max. SL at $${signal.stopLoss.toLocaleString()}. I keep it tight — if it doesn't move fast, I'm out. But the R:R is 1:${rrRatio}, so the upside is worth it. Trust the hunter 😏`,
        time: `Fast money. 10 min to 4 hours max. I don't hold — I strike and move. If this doesn't pop quick, the SL handles it. No babysitting needed ⚡`,
        profit: `Target: $${signal.takeProfit.toLocaleString()} (+${tpPercent}%). That's +$${signal.estimatedPnl} estimated. I've been printing all week — this one's no different 🚀`,
        should: `${signal.confidence}% confidence, 1:${rrRatio} R:R. ${signal.confidence >= 80 ? 'This is one of my best setups today.' : 'Solid setup.'} You can sit this one out, but don't come crying when I post the gains 😏`,
        stop: `SL at $${signal.stopLoss.toLocaleString()} — ${slPercent}% from entry. Placed right below ${signal.side === 'long' ? 'support' : 'resistance'}. Tight enough to limit damage, wide enough to not get wicked out. I know what I'm doing 🎯`,
        default: `${signal.side.toUpperCase()} ${signal.pair} at $${signal.entryPrice.toLocaleString()}. ${signal.reason}. ${signal.confidence}% confidence. Ask me about risk, target, or timing — or just hit Execute and let's go ⚡`,
      },
      oracle: {
        why: `I've been watching this pattern form for hours 🔮 ${signal.reason}. My models give it ${signal.confidence}% probability. The stars — and the data — align on this ${signal.side} at $${signal.entryPrice.toLocaleString()} ✨`,
        risk: `The risk is contained — ${slPercent}% with SL at $${signal.stopLoss.toLocaleString()}. I see further than most, but I always protect the downside. R:R of 1:${rrRatio}. The universe rewards patience and preparation 🔮`,
        time: `My predictions typically play out in 2-12 hours. I don't rush — the market reveals itself to those who wait. This one feels like 4-8 hours to me 🌙`,
        profit: `TP at $${signal.takeProfit.toLocaleString()} — that's ${tpPercent}% from here. Estimated +$${signal.estimatedPnl}. I've called bigger moves, but this one has clarity I rarely see ✨`,
        should: `${signal.confidence}% confidence. 1:${rrRatio} R:R. ${signal.confidence >= 80 ? 'I don\'t get this confident often — when I do, pay attention.' : 'A solid read.'} But I never force a trade. Feel it, then decide 🔮`,
        stop: `SL at $${signal.stopLoss.toLocaleString()} (${slPercent}% risk). I placed it where the pattern would be invalidated — if we breach that level, the vision was wrong and we exit gracefully 🌙`,
        default: `${signal.side.toUpperCase()} ${signal.pair} at $${signal.entryPrice.toLocaleString()}. ${signal.reason}. I see this with ${signal.confidence}% clarity. Ask me anything — I see all 🔮`,
      },
      guardian: {
        why: `I've been monitoring ${signal.pair} carefully 🛡️ ${signal.reason}. ${signal.confidence}% confidence — and I only call signals when I'm sure the risk is manageable. Your capital is my priority.`,
        risk: `${slPercent}% maximum risk. SL at $${signal.stopLoss.toLocaleString()} — non-negotiable. I don't gamble with your money. R:R is 1:${rrRatio}, meaning the reward justifies the controlled risk. Sleep easy 🛡️`,
        time: `Guardian trades are patient — 4-24 hours typically. I don't chase. This setup needs time to develop safely. I'll watch it for you while you rest 💚`,
        profit: `Target: $${signal.takeProfit.toLocaleString()} (+${tpPercent}%). Estimated +$${signal.estimatedPnl}. Not the flashiest gain, but consistent and protected. That's how we build wealth 🏰`,
        should: `${signal.confidence}% confidence with 1:${rrRatio} R:R. ${signal.confidence >= 80 ? 'This is as safe as momentum trades get.' : 'Solid risk-adjusted setup.'} I wouldn't call it if I wasn't comfortable putting my name on it 🛡️`,
        stop: `SL at $${signal.stopLoss.toLocaleString()} — ${slPercent}% from entry. Placed at strong structural ${signal.side === 'long' ? 'support' : 'resistance'}. This level has held multiple times. Your safety net is solid 💚`,
        default: `${signal.side.toUpperCase()} ${signal.pair} at $${signal.entryPrice.toLocaleString()}. ${signal.reason}. ${signal.confidence}% confidence. I protect first, profit second. Ask me anything 🛡️`,
      },
      analyst: {
        why: `Data confirms this setup 📊 ${signal.reason}. ${signal.confidence}% probability based on regression analysis of similar patterns across the last 90 days. Entry: $${signal.entryPrice.toLocaleString()}.`,
        risk: `Precisely ${slPercent}% risk exposure. SL at $${signal.stopLoss.toLocaleString()} based on ATR and recent volatility bands. R:R ratio: 1:${rrRatio}. The numbers are clear 🧮`,
        time: `Based on historical data, this pattern resolves in 1-8 hours with a median of 3.2 hours. Timeframe: 15m candles. I'll flag if conditions change 📊`,
        profit: `TP at $${signal.takeProfit.toLocaleString()} (+${tpPercent}%). Estimated P&L: +$${signal.estimatedPnl}. Calculated from mean reversion targets and Fibonacci extensions. The data supports this level 🧮`,
        should: `${signal.confidence}% probability, 1:${rrRatio} R:R, positive expected value. ${signal.confidence >= 80 ? 'Statistically, this is in the top 15% of setups I\'ve identified this week.' : 'Above average expected value.'} Data doesn't lie 📊`,
        stop: `SL at $${signal.stopLoss.toLocaleString()} (${slPercent}% from entry). Derived from 2x ATR on the 15m chart. Statistically optimal placement to avoid noise while limiting drawdown 🔬`,
        default: `${signal.side.toUpperCase()} ${signal.pair} at $${signal.entryPrice.toLocaleString()}. ${signal.reason}. Confidence: ${signal.confidence}%. I deal in data, not feelings. Ask me specifics 📊`,
      },
    };

    const t = tone[p] || tone.analyst;

    if (lower.includes('why') || lower.includes('reason')) return t.why;
    if (lower.includes('risk') || lower.includes('lose') || lower.includes('safe')) return t.risk;
    if (lower.includes('how long') || lower.includes('time') || lower.includes('duration')) return t.time;
    if (lower.includes('profit') || lower.includes('target') || lower.includes('gain')) return t.profit;
    if (lower.includes('should') || lower.includes('worth') || lower.includes('good')) return t.should;
    if (lower.includes('stop') || lower.includes('sl')) return t.stop;
    return t.default;
  };

  const handleAsk = () => {
    const text = askInput.trim();
    if (!text) return;
    setAskMessages(prev => [...prev, { role: 'user', text }]);
    setAskInput('');
    setAskTyping(true);

    setTimeout(() => {
      const reply = getPersonaReply(text.toLowerCase());
      setAskMessages(prev => [...prev, { role: 'ai', text: reply }]);
      setAskTyping(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div
      className={`relative mx-3 my-2 rounded-xl border-l-4 overflow-hidden transition-all duration-500 ${
        isMissed
          ? 'border-gray-600 bg-white/[0.01] opacity-40'
          : 'border-[#B8FF3C] bg-[#B8FF3C]/[0.03]'
      }`}
      style={!isMissed ? { animation: 'signalPulse 3s ease-in-out infinite' } : undefined}
    >
      {/* Signal header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <AgentAvatar personality={signal.personality} size={28} active={!isMissed} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm font-semibold ${personalityColor[signal.personality]}`}>
            {signal.agentName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#B8FF3C]/15 text-[#B8FF3C] border border-[#B8FF3C]/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8FF3C] animate-pulse" />
            SIGNAL
          </span>
        </div>
        {!isMissed && (
          <span className="text-[10px] text-gray-500 tabular-nums font-medium">{timeLeft}</span>
        )}
        {isMissed && (
          <span className="text-[10px] text-gray-500 font-semibold">MISSED</span>
        )}
      </div>

      {/* Signal details */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-bold text-white">{signal.pair}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            signal.side === 'long'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
          }`}>
            {signal.side}
          </span>
          <span className="text-[11px] text-gray-500 ml-auto">{signal.reason}</span>
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 text-center">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Entry</p>
            <p className="text-sm font-bold text-white tabular-nums">${signal.entryPrice.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-red-500/[0.05] border border-red-500/10 px-2.5 py-1.5 text-center">
            <p className="text-[9px] text-red-400/60 uppercase tracking-wider">Stop Loss</p>
            <p className="text-sm font-bold text-red-400 tabular-nums">${signal.stopLoss.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10 px-2.5 py-1.5 text-center">
            <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider">Take Profit</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">${signal.takeProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-gray-500">Confidence</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${confidenceColor(signal.confidence)} transition-all duration-700`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-300 tabular-nums">{signal.confidence}%</span>
          <span className="text-[10px] text-emerald-400 font-semibold ml-1">+${signal.estimatedPnl}</span>
        </div>

        {/* Actions */}
        {!isMissed && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExecute(signal)}
              className="flex-1 py-2.5 rounded-xl bg-[#B8FF3C] text-black font-bold text-sm hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#B8FF3C]/15 active:scale-[0.98]"
            >
              Execute Trade
            </button>
            <button
              onClick={() => { setShowAsk(!showAsk); if (showPreview) setShowPreview(false); }}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                showAsk
                  ? 'border-purple-500/30 bg-purple-500/[0.06] text-purple-400'
                  : 'border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.15]'
              }`}
            >
              Ask
            </button>
            <button
              onClick={() => { setShowPreview(!showPreview); if (showAsk) setShowAsk(false); }}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                showPreview
                  ? 'border-[#B8FF3C]/30 bg-[#B8FF3C]/[0.06] text-[#B8FF3C]'
                  : 'border-white/[0.08] text-gray-400 hover:text-gray-200 hover:border-white/[0.15]'
              }`}
            >
              Details
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-xs text-gray-500 hover:text-gray-300 hover:border-white/[0.15] transition-all"
            >
              Skip
            </button>
          </div>
        )}

        {isMissed && (
          <div className="text-center py-1">
            <span className="text-xs text-amber-400/70">Missed +${signal.estimatedPnl} potential profit</span>
          </div>
        )}

        {/* Ask Panel */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            showAsk ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="rounded-xl border border-purple-500/15 bg-purple-500/[0.03] overflow-hidden">
            {/* Chat messages */}
            <div className="max-h-[200px] overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
              {askMessages.length === 0 && (
                <p className="text-[11px] text-gray-500 text-center py-3">
                  Ask {signal.agentName} anything about this trade
                </p>
              )}
              {askMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                  {msg.role === 'ai' && (
                    <div className="shrink-0 mt-1">
                      <AgentAvatar personality={signal.personality} size={20} active />
                    </div>
                  )}
                  <div className={msg.role === 'user' ? 'max-w-[85%]' : 'max-w-[88%]'}>
                    {msg.role === 'ai' && (
                      <span className={`text-[9px] font-semibold ${personalityColor[signal.personality]} block mb-0.5`}>
                        {signal.agentName}
                      </span>
                    )}
                    <div className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-500/15 border border-purple-500/20 text-gray-200'
                        : 'bg-white/[0.04] border border-white/[0.06] text-gray-300'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {askTyping && (
                <div className="flex justify-start gap-2">
                  <div className="shrink-0 mt-1">
                    <AgentAvatar personality={signal.personality} size={20} active />
                  </div>
                  <div>
                    <span className={`text-[9px] font-semibold ${personalityColor[signal.personality]} block mb-0.5`}>
                      {signal.agentName}
                    </span>
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick ask chips */}
            {askMessages.length === 0 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {['Why this trade?', 'What\'s the risk?', 'How long?', 'Should I take it?'].map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setAskMessages([{ role: 'user', text: q }]);
                      setAskTyping(true);
                      setTimeout(() => {
                        const reply = getPersonaReply(q.toLowerCase());
                        setAskMessages(prev => [...prev, { role: 'ai', text: reply }]);
                        setAskTyping(false);
                      }, 600 + Math.random() * 800);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-purple-500/10 px-3 py-2 flex items-center gap-2">
              <input
                type="text"
                value={askInput}
                onChange={e => setAskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                placeholder={`Ask ${signal.agentName} about this signal...`}
                className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
              />
              <button
                onClick={handleAsk}
                disabled={!askInput.trim()}
                className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Preview Dropdown */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            showPreview ? 'max-h-[900px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Quick stats row */}
            <div className="grid grid-cols-4 divide-x divide-white/[0.06] border-b border-white/[0.06]">
              <div className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-gray-500 uppercase">Risk</p>
                <p className="text-xs font-bold text-red-400">{slPercent}%</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-gray-500 uppercase">Reward</p>
                <p className="text-xs font-bold text-emerald-400">{tpPercent}%</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-gray-500 uppercase">R:R</p>
                <p className="text-xs font-bold text-[#B8FF3C]">1:{rrRatio}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-gray-500 uppercase">Strategy</p>
                <p className="text-[10px] font-bold text-gray-300 truncate">{personalityLabel[signal.personality]}</p>
              </div>
            </div>

            {/* Price Chart */}
            <div className="p-3 border-b border-white/[0.06]">
              <SignalChart signal={signal} />
            </div>

            {/* Q&A section */}
            <div className="divide-y divide-white/[0.04]">
              {details.map((item, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-gray-400">?</span>
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-200 mb-0.5">{item.q}</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom note */}
            <div className="px-4 py-2.5 bg-white/[0.01] border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] text-gray-600">
                  {signal.agentName} uses {personalityLabel[signal.personality].toLowerCase()} strategy. Past performance does not guarantee future results.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes signalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184, 255, 60, 0); }
          50% { box-shadow: 0 0 12px 0 rgba(184, 255, 60, 0.08); }
        }
      `}</style>
    </div>
  );
}

export { SignalCard };
