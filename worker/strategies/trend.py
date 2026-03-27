"""Simple trend-following strategy based on SMA crossover."""

import logging
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class TrendStrategy:
    """Generates BUY/SELL signals from a short/long SMA crossover.

    Agent config may include:
        strategy_config.sma_short  – short SMA period (default 10)
        strategy_config.sma_long   – long  SMA period (default 30)
        strategy_config.amount     – trade size per signal
        strategy_config.assets     – list of symbols
    """

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _sma(closes: np.ndarray, period: int) -> np.ndarray:
        """Compute a simple moving average over *closes*."""
        if len(closes) < period:
            return np.array([])
        kernel = np.ones(period) / period
        return np.convolve(closes, kernel, mode="valid")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def evaluate(
        self,
        agent: Dict[str, Any],
        ohlcv_by_symbol: Dict[str, List[List[float]]],
    ) -> List[Dict[str, Any]]:
        """Evaluate SMA crossover for each symbol and return trade signals.

        ``ohlcv_by_symbol`` maps a symbol string to its list of
        ``[timestamp, open, high, low, close, volume]`` candles.
        """
        strategy_cfg: Dict[str, Any] = agent.get("strategy_config") or agent.get("strategyConfig") or {}
        sma_short_period: int = int(strategy_cfg.get("sma_short", 10))
        sma_long_period: int = int(strategy_cfg.get("sma_long", 30))
        amount: float = float(strategy_cfg.get("amount", 10))
        assets: List[str] = strategy_cfg.get("assets", [])

        if not assets:
            logger.warning("Trend agent %s has no assets configured", agent.get("id", "?"))
            return []

        signals: List[Dict[str, Any]] = []

        for symbol in assets:
            candles = ohlcv_by_symbol.get(symbol)
            signal = self._evaluate_symbol(
                symbol=symbol,
                candles=candles,
                sma_short_period=sma_short_period,
                sma_long_period=sma_long_period,
                amount=amount,
                agent_id=agent.get("id"),
            )
            if signal is not None:
                signals.append(signal)

        return signals

    # ------------------------------------------------------------------
    # Per-symbol evaluation
    # ------------------------------------------------------------------

    def _evaluate_symbol(
        self,
        symbol: str,
        candles: Optional[List[List[float]]],
        sma_short_period: int,
        sma_long_period: int,
        amount: float,
        agent_id: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not candles or len(candles) < sma_long_period + 1:
            logger.debug(
                "Not enough candle data for %s (have %d, need %d)",
                symbol, len(candles) if candles else 0, sma_long_period + 1,
            )
            return None

        closes = np.array([c[4] for c in candles], dtype=float)
        sma_short = self._sma(closes, sma_short_period)
        sma_long = self._sma(closes, sma_long_period)

        # Align arrays — both to the most recent point
        min_len = min(len(sma_short), len(sma_long))
        if min_len < 2:
            return None

        short_recent = sma_short[-min_len:]
        long_recent = sma_long[-min_len:]

        current_short = float(short_recent[-1])
        current_long = float(long_recent[-1])
        prev_short = float(short_recent[-2])
        prev_long = float(long_recent[-2])

        current_price = float(closes[-1])

        # Detect crossover
        if prev_short <= prev_long and current_short > current_long:
            # Bullish crossover
            quantity = amount / current_price if current_price > 0 else 0
            logger.info("Trend BUY signal for %s — SMA%d crossed above SMA%d", symbol, sma_short_period, sma_long_period)
            return {
                "action": "BUY",
                "symbol": symbol,
                "amount": round(quantity, 8),
                "price": current_price,
                "quoteAmount": amount,
                "reason": (
                    f"Bullish SMA crossover: SMA{sma_short_period} ({current_short:.2f}) "
                    f"crossed above SMA{sma_long_period} ({current_long:.2f})"
                ),
                "strategy": "trend",
                "agentId": agent_id,
            }

        if prev_short >= prev_long and current_short < current_long:
            # Bearish crossover
            quantity = amount / current_price if current_price > 0 else 0
            logger.info("Trend SELL signal for %s — SMA%d crossed below SMA%d", symbol, sma_short_period, sma_long_period)
            return {
                "action": "SELL",
                "symbol": symbol,
                "amount": round(quantity, 8),
                "price": current_price,
                "quoteAmount": amount,
                "reason": (
                    f"Bearish SMA crossover: SMA{sma_short_period} ({current_short:.2f}) "
                    f"crossed below SMA{sma_long_period} ({current_long:.2f})"
                ),
                "strategy": "trend",
                "agentId": agent_id,
            }

        logger.debug(
            "Trend: no crossover for %s — SMA%d=%.2f, SMA%d=%.2f",
            symbol, sma_short_period, current_short, sma_long_period, current_long,
        )
        return None
