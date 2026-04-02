"""Technical indicator calculations for Cladex trading strategies.

All functions operate on numpy arrays of OHLCV data.
Convention: candles = [[timestamp, open, high, low, close, volume], ...]
"""

import numpy as np
from typing import Optional


def extract_closes(candles: list) -> np.ndarray:
    return np.array([c[4] for c in candles], dtype=float)


def extract_highs(candles: list) -> np.ndarray:
    return np.array([c[2] for c in candles], dtype=float)


def extract_lows(candles: list) -> np.ndarray:
    return np.array([c[3] for c in candles], dtype=float)


def extract_volumes(candles: list) -> np.ndarray:
    return np.array([c[5] for c in candles], dtype=float)


# ---------------------------------------------------------------------------
# Moving Averages
# ---------------------------------------------------------------------------

def sma(data: np.ndarray, period: int) -> np.ndarray:
    """Simple Moving Average."""
    if len(data) < period:
        return np.array([])
    kernel = np.ones(period) / period
    return np.convolve(data, kernel, mode="valid")


def ema(data: np.ndarray, period: int) -> np.ndarray:
    """Exponential Moving Average."""
    if len(data) < period:
        return np.array([])
    result = np.empty(len(data) - period + 1)
    multiplier = 2.0 / (period + 1)
    # Seed with SMA
    result[0] = np.mean(data[:period])
    for i in range(1, len(result)):
        result[i] = (data[period - 1 + i] - result[i - 1]) * multiplier + result[i - 1]
    return result


# ---------------------------------------------------------------------------
# RSI
# ---------------------------------------------------------------------------

def rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    """Relative Strength Index. Returns array of RSI values (0-100).

    Length = len(closes) - period.
    """
    if len(closes) < period + 1:
        return np.array([])

    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    # Seed with SMA
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    rsi_values = []
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            rsi_values.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100.0 - (100.0 / (1.0 + rs)))

    # Include the first RSI value computed from the seed
    if avg_loss == 0:
        first_rsi = 100.0
    else:
        first_rsi = 100.0 - (100.0 / (1.0 + (np.mean(gains[:period]) / np.mean(losses[:period]))))

    return np.array([first_rsi] + rsi_values)


# ---------------------------------------------------------------------------
# ATR (Average True Range)
# ---------------------------------------------------------------------------

def atr(candles: list, period: int = 14) -> np.ndarray:
    """Average True Range — measures volatility.

    Returns array of ATR values.
    """
    if len(candles) < period + 1:
        return np.array([])

    highs = extract_highs(candles)
    lows = extract_lows(candles)
    closes = extract_closes(candles)

    true_ranges = np.empty(len(candles) - 1)
    for i in range(1, len(candles)):
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        true_ranges[i - 1] = tr

    # Smoothed ATR (Wilder's method)
    atr_values = [np.mean(true_ranges[:period])]
    for i in range(period, len(true_ranges)):
        atr_values.append((atr_values[-1] * (period - 1) + true_ranges[i]) / period)

    return np.array(atr_values)


# ---------------------------------------------------------------------------
# Bollinger Bands
# ---------------------------------------------------------------------------

def bollinger_bands(
    closes: np.ndarray, period: int = 20, num_std: float = 2.0
) -> tuple:
    """Returns (upper, middle, lower) bands as numpy arrays."""
    if len(closes) < period:
        return np.array([]), np.array([]), np.array([])

    middle = sma(closes, period)
    stds = np.array([
        np.std(closes[i:i + period]) for i in range(len(closes) - period + 1)
    ])
    upper = middle + num_std * stds
    lower = middle - num_std * stds
    return upper, middle, lower


# ---------------------------------------------------------------------------
# Volume Analysis
# ---------------------------------------------------------------------------

def volume_sma(candles: list, period: int = 20) -> np.ndarray:
    """SMA of volume."""
    vols = extract_volumes(candles)
    return sma(vols, period)


def volume_ratio(candles: list, period: int = 20) -> Optional[float]:
    """Current volume / average volume. >1.5 = high volume."""
    vols = extract_volumes(candles)
    if len(vols) < period + 1:
        return None
    avg = np.mean(vols[-period - 1:-1])
    if avg <= 0:
        return None
    return float(vols[-1] / avg)


def volume_trend(candles: list, lookback: int = 10) -> Optional[float]:
    """Linear regression slope of volume over lookback candles.

    Positive = volume increasing. Normalized by mean volume.
    """
    vols = extract_volumes(candles)
    if len(vols) < lookback:
        return None
    recent = vols[-lookback:]
    mean_vol = np.mean(recent)
    if mean_vol <= 0:
        return None
    x = np.arange(lookback, dtype=float)
    slope = np.polyfit(x, recent, 1)[0]
    return float(slope / mean_vol)


# ---------------------------------------------------------------------------
# Price Action
# ---------------------------------------------------------------------------

def price_range_percent(candles: list, lookback: int = 20) -> Optional[float]:
    """Price range as % of current price over lookback candles.

    Low value = tight consolidation (compression).
    """
    if len(candles) < lookback:
        return None
    recent = candles[-lookback:]
    highs = np.array([c[2] for c in recent])
    lows = np.array([c[3] for c in recent])
    price = candles[-1][4]
    if price <= 0:
        return None
    return float((np.max(highs) - np.min(lows)) / price * 100)


def is_breakout(candles: list, lookback: int = 20) -> tuple:
    """Check if current close breaks above/below the range.

    Returns (direction, strength) where direction is "up", "down", or None.
    Strength is how far above/below the range boundary (as %).
    """
    if len(candles) < lookback + 1:
        return None, 0.0

    # Use candles excluding the most recent one for the range
    range_candles = candles[-(lookback + 1):-1]
    highs = np.array([c[2] for c in range_candles])
    lows = np.array([c[3] for c in range_candles])
    resistance = np.max(highs)
    support = np.min(lows)
    current_close = candles[-1][4]

    if current_close > resistance and resistance > 0:
        strength = (current_close - resistance) / resistance * 100
        return "up", strength
    elif current_close < support and support > 0:
        strength = (support - current_close) / support * 100
        return "down", strength
    return None, 0.0
