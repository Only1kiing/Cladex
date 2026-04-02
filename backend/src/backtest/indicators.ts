// ---------------------------------------------------------------------------
// Technical indicators — TypeScript port for backtesting engine
// ---------------------------------------------------------------------------

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function parseCandles(raw: number[][]): Candle[] {
  return raw.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp,
    open,
    high,
    low,
    close,
    volume,
  }));
}

// ---------------------------------------------------------------------------
// Moving Averages
// ---------------------------------------------------------------------------

export function sma(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result.push(sum / period);
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    result.push(sum / period);
  }
  return result;
}

export function ema(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const multiplier = 2 / (period + 1);
  const result: number[] = [];
  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result.push(sum / period);
  for (let i = period; i < data.length; i++) {
    result.push((data[i] - result[result.length - 1]) * multiplier + result[result.length - 1]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// RSI
// ---------------------------------------------------------------------------

export function rsi(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return [];
  const result: number[] = [];

  let avgGain = 0;
  let avgLoss = 0;

  // Seed
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  return result;
}

// ---------------------------------------------------------------------------
// ATR
// ---------------------------------------------------------------------------

export function atr(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }

  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i];
  result.push(sum / period);

  for (let i = period; i < trs.length; i++) {
    result.push((result[result.length - 1] * (period - 1) + trs[i]) / period);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Bollinger Bands
// ---------------------------------------------------------------------------

export function bollingerBands(
  closes: number[],
  period: number = 20,
  numStd: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < middle.length; i++) {
    const slice = closes.slice(i, i + period);
    const mean = middle[i];
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + numStd * std);
    lower.push(mean - numStd * std);
  }

  return { upper, middle, lower };
}

// ---------------------------------------------------------------------------
// Volume helpers
// ---------------------------------------------------------------------------

export function volumeRatio(candles: Candle[], period: number = 20): number | null {
  if (candles.length < period + 1) return null;
  const vols = candles.map((c) => c.volume);
  const avg = vols.slice(-period - 1, -1).reduce((s, v) => s + v, 0) / period;
  if (avg <= 0) return null;
  return vols[vols.length - 1] / avg;
}

export function volumeTrend(candles: Candle[], lookback: number = 10): number | null {
  if (candles.length < lookback) return null;
  const vols = candles.slice(-lookback).map((c) => c.volume);
  const mean = vols.reduce((s, v) => s + v, 0) / lookback;
  if (mean <= 0) return null;

  // Linear regression slope
  let sumXY = 0;
  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  for (let i = 0; i < lookback; i++) {
    sumXY += i * vols[i];
    sumX += i;
    sumY += vols[i];
    sumX2 += i * i;
  }
  const slope = (lookback * sumXY - sumX * sumY) / (lookback * sumX2 - sumX * sumX);
  return slope / mean;
}

export function priceRangePercent(candles: Candle[], lookback: number = 20): number | null {
  if (candles.length < lookback) return null;
  const recent = candles.slice(-lookback);
  const high = Math.max(...recent.map((c) => c.high));
  const low = Math.min(...recent.map((c) => c.low));
  const price = candles[candles.length - 1].close;
  if (price <= 0) return null;
  return ((high - low) / price) * 100;
}
