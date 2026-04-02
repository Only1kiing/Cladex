// ---------------------------------------------------------------------------
// Backtest strategy implementations — mirrors Python worker strategies
// ---------------------------------------------------------------------------

import type { Candle } from "./indicators";
import { ema, sma, rsi, atr, bollingerBands, volumeRatio, volumeTrend, priceRangePercent } from "./indicators";

export interface BacktestSignal {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  reason: string;
  sizeMultiplier: number;  // 0.5–1.3 based on conviction
}

type StrategyFn = (candles: Candle[], riskLevel: string) => BacktestSignal;

// ---------------------------------------------------------------------------
// SAFEFLOW — Capital preservation, dip-buying in uptrends
// ---------------------------------------------------------------------------

function safeflow(candles: Candle[], riskLevel: string): BacktestSignal {
  const hold: BacktestSignal = { action: "HOLD", confidence: 0, stopLossPercent: 2, takeProfitPercent: 5, reason: "", sizeMultiplier: 1 };

  if (candles.length < 60) return hold;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];

  // Signal 1: RSI oversold
  const rsiValues = rsi(closes, 14);
  if (rsiValues.length < 2) return hold;
  const curRsi = rsiValues[rsiValues.length - 1];
  const threshold = riskLevel === "HIGH" ? 42 : riskLevel === "MEDIUM" ? 38 : 35;
  if (curRsi >= threshold) return hold;

  // Signal 2: Uptrend
  const trendMa = candles.length >= 200 ? sma(closes, 200) : ema(closes, 50);
  if (trendMa.length === 0 || price <= trendMa[trendMa.length - 1]) return hold;

  // Signal 3: Volatility filter
  const atrValues = atr(candles, 14);
  if (atrValues.length < 10) return hold;
  const curAtr = atrValues[atrValues.length - 1];
  const avgAtr = atrValues.slice(-20).reduce((s, v) => s + v, 0) / Math.min(atrValues.length, 20);
  const atrRatio = avgAtr > 0 ? curAtr / avgAtr : 1;
  if (atrRatio > 2.0) return hold;

  let confidence = curRsi < 25 ? 90 : curRsi < 30 ? 75 : 60;
  if (rsiValues[rsiValues.length - 1] > rsiValues[rsiValues.length - 2]) confidence += 10;
  if (atrRatio > 1.5) confidence -= 10;
  confidence = Math.min(confidence, 95);

  const sizeMult = atrRatio > 1.3 ? 0.7 : atrRatio > 1.0 ? 0.85 : 1.0;

  return {
    action: "BUY",
    confidence,
    stopLossPercent: 2,
    takeProfitPercent: 5,
    reason: `RSI ${curRsi.toFixed(0)} oversold, above MA, ATR ratio ${atrRatio.toFixed(2)}`,
    sizeMultiplier: sizeMult,
  };
}

// ---------------------------------------------------------------------------
// TREND PRO — Momentum + confirmation
// ---------------------------------------------------------------------------

function trendPro(candles: Candle[], riskLevel: string): BacktestSignal {
  const hold: BacktestSignal = { action: "HOLD", confidence: 0, stopLossPercent: 3, takeProfitPercent: 10, reason: "", sizeMultiplier: 1 };

  if (candles.length < 55) return hold;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];

  // Signal 1: EMA crossover
  const emaFast = ema(closes, 20);
  const emaSlow = ema(closes, 50);
  const minLen = Math.min(emaFast.length, emaSlow.length);
  if (minLen < 3) return hold;

  const fast = emaFast.slice(-minLen);
  const slow = emaSlow.slice(-minLen);
  const curF = fast[fast.length - 1];
  const curS = slow[slow.length - 1];
  const prevF = fast[fast.length - 2];
  const prevS = slow[slow.length - 2];

  let bullish = prevF <= prevS && curF > curS;
  let bearish = prevF >= prevS && curF < curS;

  // Also check one bar earlier
  if (!bullish && !bearish && fast.length >= 3) {
    const prev2F = fast[fast.length - 3];
    const prev2S = slow[slow.length - 3];
    if (prev2F <= prev2S && prevF > prevS && curF > curS) bullish = true;
    if (prev2F >= prev2S && prevF < prevS && curF < curS) bearish = true;
  }

  if (!bullish && !bearish) return hold;
  const action = bullish ? "BUY" : "SELL";

  // Signal 2: Volume
  const volR = volumeRatio(candles, 20);
  if (volR === null || volR < 1.2) return hold;

  // Signal 3: Price alignment
  if (action === "BUY" && price < curS) return hold;
  if (action === "SELL" && price > curS) return hold;

  // RSI filter
  const rsiValues = rsi(closes, 14);
  if (rsiValues.length > 0) {
    const curRsi = rsiValues[rsiValues.length - 1];
    if (action === "BUY" && curRsi > 75) return hold;
    if (action === "SELL" && curRsi < 25) return hold;
  }

  let confidence = 50;
  const spread = Math.abs(curF - curS) / curS * 100;
  if (spread > 1) confidence += 10;
  else if (spread > 0.5) confidence += 5;
  if (volR > 2) confidence += 15;
  else if (volR > 1.5) confidence += 10;
  else confidence += 5;
  confidence = Math.min(confidence, 95);

  const minConf = riskLevel === "LOW" ? 60 : riskLevel === "MEDIUM" ? 55 : 50;
  if (confidence < minConf) return hold;

  // ATR-based stop
  const atrValues = atr(candles, 14);
  let stopPct = 3;
  if (atrValues.length > 0) {
    const curAtr = atrValues[atrValues.length - 1];
    const avgAtr = atrValues.slice(-20).reduce((s, v) => s + v, 0) / Math.min(atrValues.length, 20);
    const ratio = avgAtr > 0 ? curAtr / avgAtr : 1;
    stopPct = Math.min(3 * Math.max(ratio, 1), 8);
  }

  return {
    action,
    confidence,
    stopLossPercent: stopPct,
    takeProfitPercent: 10,
    reason: `EMA crossover, volume ${volR?.toFixed(1)}x`,
    sizeMultiplier: 1,
  };
}

// ---------------------------------------------------------------------------
// BEAST MODE — Breakout alpha hunter
// ---------------------------------------------------------------------------

function beastMode(candles: Candle[], riskLevel: string): BacktestSignal {
  const hold: BacktestSignal = { action: "HOLD", confidence: 0, stopLossPercent: 3.5, takeProfitPercent: 5, reason: "", sizeMultiplier: 1 };

  if (candles.length < 30) return hold;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];

  // Signal 1: Compression
  let compressionScore = 0;
  const rangePct = priceRangePercent(candles, 20);
  if (rangePct !== null && rangePct < 8) compressionScore++;

  const bb = bollingerBands(closes, 20, 2);
  if (bb.upper.length > 0) {
    const bbWidth = (bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1]) / price;
    if (bbWidth < 0.03) compressionScore++;
  }

  const atrValues = atr(candles, 14);
  if (atrValues.length > 10) {
    const recent = atrValues.slice(-5).reduce((s, v) => s + v, 0) / 5;
    const older = atrValues.slice(-15, -5).reduce((s, v) => s + v, 0) / Math.min(10, atrValues.slice(-15, -5).length || 1);
    if (older > 0 && recent < older * 0.85) compressionScore++;
  }

  if (compressionScore < 1) return hold;

  // Signal 2: Volume accumulation
  let volScore = 0;
  const volT = volumeTrend(candles, 10);
  if (volT !== null && volT > 0.02) volScore++;
  const volR = volumeRatio(candles, 20);
  if (volR !== null && volR > 1.0) volScore++;
  if (volScore < 1) return hold;

  // Signal 3: Breakout
  if (candles.length < 22) return hold;
  const rangeCandles = candles.slice(-21, -1);
  const resistance = Math.max(...rangeCandles.map((c) => c.high));
  const support = Math.min(...rangeCandles.map((c) => c.low));

  let action: "BUY" | "SELL" | "HOLD" = "HOLD";
  let breakoutStrength = 0;

  if (price > resistance && resistance > 0) {
    action = "BUY";
    breakoutStrength = ((price - resistance) / resistance) * 100;
  } else if (price < support && support > 0) {
    action = "SELL";
    breakoutStrength = ((support - price) / support) * 100;
  }

  if (action === "HOLD" || breakoutStrength < 0.5) return hold;

  // Candle body check
  const last = candles[candles.length - 1];
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  if (range > 0 && body / range < 0.4) return hold;

  // RSI check
  const rsiValues = rsi(closes, 14);
  if (rsiValues.length > 0) {
    const curRsi = rsiValues[rsiValues.length - 1];
    if (action === "BUY" && curRsi > 80) return hold;
    if (action === "SELL" && curRsi < 20) return hold;
  }

  let confidence = 40 + compressionScore * 10 + volScore * 8;
  if (breakoutStrength > 2) confidence += 15;
  else if (breakoutStrength > 1) confidence += 10;
  else confidence += 5;
  if (volR !== null && volR > 2) confidence += 10;
  confidence = Math.min(confidence, 95);

  const minConf = riskLevel === "LOW" ? 65 : riskLevel === "MEDIUM" ? 55 : 50;
  if (confidence < minConf) return hold;

  const sizeMult = riskLevel === "HIGH" && confidence > 75 ? 1.3 : confidence < 60 ? 0.7 : 1.0;

  return {
    action,
    confidence,
    stopLossPercent: 3.5,
    takeProfitPercent: 5,
    reason: `Compression + volume + breakout ${breakoutStrength.toFixed(1)}%`,
    sizeMultiplier: sizeMult,
  };
}

// ---------------------------------------------------------------------------
// DCA
// ---------------------------------------------------------------------------

let dcaLastBuy = 0;

function dca(candles: Candle[], _riskLevel: string): BacktestSignal {
  const hold: BacktestSignal = { action: "HOLD", confidence: 0, stopLossPercent: 5, takeProfitPercent: 10, reason: "", sizeMultiplier: 1 };
  // Buy every 24 candles (for 1h = daily, for 4h = every 4 days)
  dcaLastBuy++;
  if (dcaLastBuy < 24) return hold;
  dcaLastBuy = 0;
  return {
    action: "BUY",
    confidence: 50,
    stopLossPercent: 5,
    takeProfitPercent: 10,
    reason: "DCA periodic buy",
    sizeMultiplier: 1,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const STRATEGIES: Record<string, StrategyFn> = {
  safeflow,
  trend_pro: trendPro,
  beast_mode: beastMode,
  dca,
};

export function getStrategy(name: string): StrategyFn | null {
  return STRATEGIES[name.toLowerCase()] || null;
}
