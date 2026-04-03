import { describe, it, expect } from "vitest";
import { sma, ema, rsi, atr, bollingerBands } from "../backtest/indicators";
import type { Candle } from "../backtest/indicators";

// ---------------------------------------------------------------------------
// SMA
// ---------------------------------------------------------------------------

describe("sma", () => {
  it("calculates correct SMA", () => {
    const data = [1, 2, 3, 4, 5];
    const result = sma(data, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(2);    // (1+2+3)/3
    expect(result[1]).toBeCloseTo(3);    // (2+3+4)/3
    expect(result[2]).toBeCloseTo(4);    // (3+4+5)/3
  });

  it("returns empty for insufficient data", () => {
    expect(sma([1, 2], 5)).toHaveLength(0);
  });

  it("handles single value output", () => {
    const result = sma([10, 20, 30], 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(20);
  });
});

// ---------------------------------------------------------------------------
// EMA
// ---------------------------------------------------------------------------

describe("ema", () => {
  it("first value equals SMA seed", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ema(data, 5);
    expect(result[0]).toBeCloseTo(3); // SMA of first 5: (1+2+3+4+5)/5 = 3
  });

  it("returns empty for insufficient data", () => {
    expect(ema([1, 2], 5)).toHaveLength(0);
  });

  it("reacts to price changes faster than SMA", () => {
    const data = [10, 10, 10, 10, 10, 20, 20, 20];
    const emaResult = ema(data, 5);
    const smaResult = sma(data, 5);
    // After the jump to 20, EMA should be higher than SMA (reacts faster)
    const emaLast = emaResult[emaResult.length - 1];
    const smaLast = smaResult[smaResult.length - 1];
    expect(emaLast).toBeGreaterThanOrEqual(smaLast);
  });
});

// ---------------------------------------------------------------------------
// RSI
// ---------------------------------------------------------------------------

describe("rsi", () => {
  it("returns values between 0 and 100", () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 10);
    const result = rsi(data, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("returns 100 for continuously rising prices", () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = rsi(data, 14);
    // Last few values should be near 100
    expect(result[result.length - 1]).toBeGreaterThan(90);
  });

  it("returns low values for continuously falling prices", () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 - i);
    const result = rsi(data, 14);
    expect(result[result.length - 1]).toBeLessThan(10);
  });

  it("returns empty for insufficient data", () => {
    expect(rsi([1, 2, 3], 14)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ATR
// ---------------------------------------------------------------------------

describe("atr", () => {
  function makeCandles(n: number): Candle[] {
    return Array.from({ length: n }, (_, i) => ({
      timestamp: i * 3600000,
      open: 100 + Math.random() * 2,
      high: 103 + Math.random() * 2,
      low: 97 + Math.random() * 2,
      close: 100 + Math.random() * 2,
      volume: 1000,
    }));
  }

  it("returns positive values", () => {
    const candles = makeCandles(30);
    const result = atr(candles, 14);
    expect(result.length).toBeGreaterThan(0);
    for (const v of result) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it("returns empty for insufficient candles", () => {
    expect(atr(makeCandles(5), 14)).toHaveLength(0);
  });

  it("higher volatility produces higher ATR", () => {
    const calm = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i * 3600000,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
    }));
    const wild = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i * 3600000,
      open: 100,
      high: 110,
      low: 90,
      close: 100,
      volume: 1000,
    }));

    const calmAtr = atr(calm, 14);
    const wildAtr = atr(wild, 14);
    expect(wildAtr[wildAtr.length - 1]).toBeGreaterThan(calmAtr[calmAtr.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// Bollinger Bands
// ---------------------------------------------------------------------------

describe("bollingerBands", () => {
  it("upper > middle > lower", () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
    const { upper, middle, lower } = bollingerBands(data, 20, 2);
    expect(upper.length).toBeGreaterThan(0);
    for (let i = 0; i < upper.length; i++) {
      expect(upper[i]).toBeGreaterThan(middle[i]);
      expect(middle[i]).toBeGreaterThan(lower[i]);
    }
  });

  it("bands narrow during low volatility", () => {
    const flat = Array.from({ length: 30 }, () => 100);
    const { upper, lower } = bollingerBands(flat, 20, 2);
    // All values the same = zero std = bands collapse to middle
    const width = upper[0] - lower[0];
    expect(width).toBeCloseTo(0);
  });
});
