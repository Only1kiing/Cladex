"""TREND PRO — Momentum + confirmation strategy.

Multi-signal trend follower combining EMA crossover, volume confirmation,
and breakout validation. Designed to ride strong trends with controlled risk.

Entry: EMA20 crosses above EMA50 + volume above average + breakout confirmation
Exit:  Trailing stop below EMA, partial profit at +5% and +10%
Invalidation: EMA cross reversal or volume collapse
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from strategies.indicators import (
    extract_closes,
    ema,
    rsi,
    atr,
    volume_ratio,
    volume_trend,
    is_breakout,
)

logger = logging.getLogger(__name__)

# Defaults
EMA_FAST = 20
EMA_SLOW = 50
RSI_PERIOD = 14
ATR_PERIOD = 14
VOL_AVG_PERIOD = 20
MIN_VOLUME_RATIO = 1.2          # Volume must be 20%+ above average
DEFAULT_AMOUNT = 10.0
STOP_LOSS_PCT = 0.03            # 3%
TP_LEVELS = [
    {"percent": 5, "fraction": 0.40},
    {"percent": 10, "fraction": 0.35},
    {"percent": 15, "fraction": 0.25},
]


class TrendProStrategy:
    """Momentum trend-following with multi-signal confirmation."""

    def evaluate(
        self,
        agent: Dict[str, Any],
        ohlcv_by_symbol: Dict[str, List[List[float]]],
    ) -> List[Dict[str, Any]]:
        cfg: Dict[str, Any] = (
            agent.get("strategy_config") or agent.get("strategyConfig") or {}
        )
        amount = float(cfg.get("amount", DEFAULT_AMOUNT))
        assets: List[str] = cfg.get("assets", [])
        agent_id = agent.get("id")
        risk_level = (agent.get("riskLevel") or "MEDIUM").upper()

        signals: List[Dict[str, Any]] = []
        for symbol in assets:
            candles = ohlcv_by_symbol.get(symbol)
            sig = self._evaluate_symbol(
                symbol, candles, amount, risk_level, agent_id
            )
            if sig:
                signals.append(sig)
        return signals

    def _evaluate_symbol(
        self,
        symbol: str,
        candles: Optional[List[List[float]]],
        amount: float,
        risk_level: str,
        agent_id: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not candles or len(candles) < EMA_SLOW + 5:
            logger.debug(
                "TrendPro: not enough data for %s (%d candles)",
                symbol, len(candles) if candles else 0,
            )
            return None

        closes = extract_closes(candles)
        current_price = float(closes[-1])
        if current_price <= 0:
            return None

        # --- Signal 1: EMA crossover ---
        ema_fast = ema(closes, EMA_FAST)
        ema_slow = ema(closes, EMA_SLOW)

        # Align to same length
        min_len = min(len(ema_fast), len(ema_slow))
        if min_len < 3:
            return None

        fast = ema_fast[-min_len:]
        slow = ema_slow[-min_len:]

        cur_fast = float(fast[-1])
        cur_slow = float(slow[-1])
        prev_fast = float(fast[-2])
        prev_slow = float(slow[-2])
        prev2_fast = float(fast[-3])
        prev2_slow = float(slow[-3])

        # Detect fresh crossover (within last 2 bars)
        bullish_cross = False
        bearish_cross = False

        if prev_fast <= prev_slow and cur_fast > cur_slow:
            bullish_cross = True
        elif prev2_fast <= prev2_slow and prev_fast > prev_slow and cur_fast > cur_slow:
            # Crossover happened 1 bar ago, still valid
            bullish_cross = True

        if prev_fast >= prev_slow and cur_fast < cur_slow:
            bearish_cross = True
        elif prev2_fast >= prev2_slow and prev_fast < prev_slow and cur_fast < cur_slow:
            bearish_cross = True

        if not bullish_cross and not bearish_cross:
            logger.debug("TrendPro %s: no EMA crossover", symbol)
            return None

        action = "BUY" if bullish_cross else "SELL"

        # --- Signal 2: Volume confirmation ---
        vol_r = volume_ratio(candles, VOL_AVG_PERIOD)
        if vol_r is None:
            return None

        if vol_r < MIN_VOLUME_RATIO:
            logger.debug(
                "TrendPro %s: volume too low (%.2fx, need %.2fx)",
                symbol, vol_r, MIN_VOLUME_RATIO,
            )
            return None

        # --- Signal 3: Breakout / trend strength ---
        # For BUY: price should be above EMA slow (trending up)
        # For SELL: price should be below EMA slow
        if action == "BUY" and current_price < cur_slow:
            logger.debug("TrendPro %s: bullish cross but price below EMA slow", symbol)
            return None
        if action == "SELL" and current_price > cur_slow:
            logger.debug("TrendPro %s: bearish cross but price above EMA slow", symbol)
            return None

        # Check for breakout confirmation
        breakout_dir, breakout_strength = is_breakout(candles, lookback=20)
        has_breakout = False
        if action == "BUY" and breakout_dir == "up" and breakout_strength > 0.3:
            has_breakout = True
        elif action == "SELL" and breakout_dir == "down" and breakout_strength > 0.3:
            has_breakout = True

        # --- RSI filter (avoid overbought buys / oversold sells) ---
        rsi_values = rsi(closes, RSI_PERIOD)
        rsi_ok = True
        current_rsi = 50.0
        if len(rsi_values) > 0:
            current_rsi = float(rsi_values[-1])
            if action == "BUY" and current_rsi > 75:
                logger.debug("TrendPro %s: RSI %.0f too high for BUY", symbol, current_rsi)
                rsi_ok = False
            if action == "SELL" and current_rsi < 25:
                logger.debug("TrendPro %s: RSI %.0f too low for SELL", symbol, current_rsi)
                rsi_ok = False

        if not rsi_ok:
            return None

        # --- Volume trend (increasing = stronger signal) ---
        vol_t = volume_trend(candles, lookback=10)

        # --- Confidence scoring ---
        confidence = 50

        # EMA spread strength
        ema_spread = abs(cur_fast - cur_slow) / cur_slow * 100 if cur_slow > 0 else 0
        if ema_spread > 1.0:
            confidence += 10
        elif ema_spread > 0.5:
            confidence += 5

        # Volume strength
        if vol_r > 2.0:
            confidence += 15
        elif vol_r > 1.5:
            confidence += 10
        else:
            confidence += 5

        # Breakout bonus
        if has_breakout:
            confidence += 15

        # Volume trend bonus
        if vol_t is not None and vol_t > 0.05:
            confidence += 5

        # RSI alignment
        if action == "BUY" and 40 < current_rsi < 65:
            confidence += 5  # healthy momentum zone
        elif action == "SELL" and 35 < current_rsi < 60:
            confidence += 5

        confidence = min(confidence, 95)

        # Min confidence threshold
        min_conf = 60 if risk_level == "LOW" else 55 if risk_level == "MEDIUM" else 50
        if confidence < min_conf:
            logger.debug("TrendPro %s: confidence %d below threshold %d", symbol, confidence, min_conf)
            return None

        # --- Position sizing ---
        # ATR-based volatility adjustment
        atr_values = atr(candles, ATR_PERIOD)
        vol_multiplier = 1.0
        if len(atr_values) > 10:
            cur_atr = float(atr_values[-1])
            avg_atr = float(np.mean(atr_values[-20:]))
            atr_ratio = cur_atr / avg_atr if avg_atr > 0 else 1.0
            if atr_ratio > 1.8:
                vol_multiplier = 0.6
            elif atr_ratio > 1.3:
                vol_multiplier = 0.8
            stop_pct = min(STOP_LOSS_PCT * max(atr_ratio, 1.0), 0.08)
        else:
            stop_pct = STOP_LOSS_PCT

        adjusted_amount = amount * vol_multiplier
        quantity = adjusted_amount / current_price

        # Stop-loss and take-profit
        if action == "BUY":
            stop_loss = round(current_price * (1 - stop_pct), 8)
            tp_levels = [
                {
                    "percent": lv["percent"],
                    "sellFraction": lv["fraction"],
                    "targetPrice": round(current_price * (1 + lv["percent"] / 100), 8),
                }
                for lv in TP_LEVELS
            ]
        else:
            stop_loss = round(current_price * (1 + stop_pct), 8)
            tp_levels = [
                {
                    "percent": lv["percent"],
                    "sellFraction": lv["fraction"],
                    "targetPrice": round(current_price * (1 - lv["percent"] / 100), 8),
                }
                for lv in TP_LEVELS
            ]

        breakout_str = f", breakout +{breakout_strength:.1f}%" if has_breakout else ""
        reason = (
            f"TrendPro {action}: EMA{EMA_FAST} ({cur_fast:.2f}) crossed "
            f"{'above' if bullish_cross else 'below'} EMA{EMA_SLOW} ({cur_slow:.2f}), "
            f"volume {vol_r:.1f}x avg, RSI {current_rsi:.0f}"
            f"{breakout_str} [confidence {confidence}%]"
        )

        logger.info("TrendPro signal: %s %s — %s", action, symbol, reason)

        return {
            "action": action,
            "symbol": symbol,
            "amount": round(quantity, 8),
            "price": current_price,
            "quoteAmount": round(adjusted_amount, 2),
            "stopLoss": stop_loss,
            "takeProfit": tp_levels[0]["targetPrice"],
            "takeProfitLevels": tp_levels,
            "confidence": confidence,
            "reason": reason,
            "strategy": "trend_pro",
            "agentId": agent_id,
        }
