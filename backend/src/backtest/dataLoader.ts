// ---------------------------------------------------------------------------
// Historical data loader — fetches OHLCV via ccxt for backtesting
// ---------------------------------------------------------------------------

import ccxt from "ccxt";
import type { Candle } from "./indicators";

const VALID_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type Timeframe = (typeof VALID_TIMEFRAMES)[number];

const SUPPORTED_EXCHANGES: Record<string, string> = {
  binance: "binance",
  bybit: "bybit",
  okx: "okx",
};

// Max ranges to prevent overload (in candles)
const MAX_CANDLES: Record<Timeframe, number> = {
  "1m": 1440 * 7,    // 7 days
  "5m": 288 * 30,    // 30 days
  "15m": 96 * 90,    // 90 days
  "1h": 24 * 365,    // 1 year
  "4h": 6 * 365,     // 1 year
  "1d": 365 * 3,     // 3 years
};

// Cache to avoid re-fetching during the same session
const dataCache = new Map<string, Candle[]>();

function cacheKey(exchange: string, symbol: string, timeframe: string, since: number, until: number): string {
  return `${exchange}:${symbol}:${timeframe}:${since}:${until}`;
}

export function isValidTimeframe(tf: string): tf is Timeframe {
  return VALID_TIMEFRAMES.includes(tf as Timeframe);
}

/**
 * Fetch historical OHLCV candles.
 *
 * Handles pagination automatically since exchanges limit candles per request.
 */
export async function fetchHistoricalData(opts: {
  symbol: string;
  timeframe: Timeframe;
  startDate: string;    // ISO date string
  endDate: string;      // ISO date string
  exchange?: string;
}): Promise<Candle[]> {
  const { symbol, timeframe, startDate, endDate, exchange: exchangeId = "binance" } = opts;

  const ccxtId = SUPPORTED_EXCHANGES[exchangeId.toLowerCase()];
  if (!ccxtId) {
    throw new Error(`Unsupported exchange: ${exchangeId}. Use: ${Object.keys(SUPPORTED_EXCHANGES).join(", ")}`);
  }

  const since = new Date(startDate).getTime();
  const until = new Date(endDate).getTime();

  if (since >= until) {
    throw new Error("startDate must be before endDate");
  }

  // Check cache
  const key = cacheKey(ccxtId, symbol, timeframe, since, until);
  if (dataCache.has(key)) {
    return dataCache.get(key)!;
  }

  // Check max candles
  const tfMs = timeframeToMs(timeframe);
  const estimatedCandles = Math.ceil((until - since) / tfMs);
  const maxCandles = MAX_CANDLES[timeframe];
  if (estimatedCandles > maxCandles) {
    throw new Error(
      `Requested ${estimatedCandles} candles exceeds max ${maxCandles} for ${timeframe}. ` +
      `Reduce date range or use a larger timeframe.`
    );
  }

  const ExchangeClass = (ccxt as Record<string, any>)[ccxtId];
  if (!ExchangeClass) {
    throw new Error(`ccxt exchange class not found: ${ccxtId}`);
  }

  const exchange = new ExchangeClass({ enableRateLimit: true }) as any;

  // Paginated fetch
  const allCandles: Candle[] = [];
  let cursor = since;
  const batchSize = 1000; // most exchanges cap at 1000

  while (cursor < until) {
    const raw: number[][] = await exchange.fetchOHLCV(symbol, timeframe, cursor, batchSize);

    if (!raw || raw.length === 0) break;

    for (const r of raw) {
      const ts = r[0];
      if (ts > until) break;
      allCandles.push({
        timestamp: ts,
        open: r[1],
        high: r[2],
        low: r[3],
        close: r[4],
        volume: r[5],
      });
    }

    const lastTs = raw[raw.length - 1][0];
    if (lastTs <= cursor) break; // no progress
    cursor = lastTs + tfMs;

    // Rate limit courtesy
    await new Promise((r) => setTimeout(r, exchange.rateLimit || 100));
  }

  // Cache result
  if (allCandles.length > 0) {
    dataCache.set(key, allCandles);
    // Evict old entries if cache gets large
    if (dataCache.size > 50) {
      const firstKey = dataCache.keys().next().value;
      if (firstKey) dataCache.delete(firstKey);
    }
  }

  return allCandles;
}

function timeframeToMs(tf: Timeframe): number {
  const map: Record<Timeframe, number> = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
  };
  return map[tf];
}
