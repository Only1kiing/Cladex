"""SAFEFLOW — Capital preservation strategy.

Multi-signal approach combining RSI oversold zones, long-term trend
confirmation (200 SMA), and ATR volatility filtering.

Entry: RSI < 35 + price above 200 SMA + volatility not extreme
Exit:  Take profit +3% to +6%, stop loss -2%
Edge:  Buys dips in confirmed uptrends, sits out during chaos.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from strategies.indicators import (
    extract_closes,
    sma,
    ema,
    rsi,
    atr,
    volume_ratio,
)

logger = logging.getLogger(__name__)

# Defaults
RSI_OVERSOLD = 35
RSI_PERIOD = 14
TREND_SMA_PERIOD = 200
TREND_EMA_PERIOD = 50          # fallback if not enough data for 200 SMA
ATR_PERIOD = 14
ATR_HIGH_MULTIPLIER = 2.0      # ATR > 2x average = extreme volatility
DEFAULT_AMOUNT = 10.0           # $10 per trade
STOP_LOSS_PCT = 0.02            # 2%
TP_LEVELS = [
    {"percent": 3, "fraction": 0.40},
    {"percent": 5, "fraction": 0.35},
    {"percent": 6, "fraction": 0.25},
]


class SafeFlowStrategy:
    """Low-risk, dip-buying strategy for confirmed uptrends."""

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
        risk_level = (agent.get("riskLevel") or "LOW").upper()

        # Adjust aggressiveness by risk level
        rsi_threshold = RSI_OVERSOLD
        if risk_level == "MEDIUM":
            rsi_threshold = 38
        elif risk_level == "HIGH":
            rsi_threshold = 42

        signals: List[Dict[str, Any]] = []
        for symbol in assets:
            candles = ohlcv_by_symbol.get(symbol)
            sig = self._evaluate_symbol(
                symbol, candles, amount, rsi_threshold, agent_id
            )
            if sig:
                signals.append(sig)
        return signals

    def _evaluate_symbol(
        self,
        symbol: str,
        candles: Optional[List[List[float]]],
        amount: float,
        rsi_threshold: float,
        agent_id: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not candles or len(candles) < 60:
            logger.debug("SafeFlow: not enough data for %s (%d candles)",
                         symbol, len(candles) if candles else 0)
            return None

        closes = extract_closes(candles)
        current_price = float(closes[-1])
        if current_price <= 0:
            return None

        # --- Signal 1: RSI oversold ---
        rsi_values = rsi(closes, RSI_PERIOD)
        if len(rsi_values) < 2:
            return None
        current_rsi = float(rsi_values[-1])
        prev_rsi = float(rsi_values[-2])

        if current_rsi >= rsi_threshold:
            logger.debug("SafeFlow %s: RSI %.1f not oversold (threshold %d)",
                         symbol, current_rsi, rsi_threshold)
            return None

        # --- Signal 2: Long-term uptrend ---
        # Try 200 SMA; fall back to 50 EMA if not enough data
        in_uptrend = False
        trend_label = ""

        if len(closes) >= TREND_SMA_PERIOD:
            sma_200 = sma(closes, TREND_SMA_PERIOD)
            if len(sma_200) > 0 and current_price > float(sma_200[-1]):
                in_uptrend = True
                trend_label = f"above SMA200 ({float(sma_200[-1]):.2f})"
        else:
            ema_50 = ema(closes, TREND_EMA_PERIOD)
            if len(ema_50) > 0 and current_price > float(ema_50[-1]):
                in_uptrend = True
                trend_label = f"above EMA50 ({float(ema_50[-1]):.2f})"

        if not in_uptrend:
            logger.debug("SafeFlow %s: not in uptrend — skipping", symbol)
            return None

        # --- Signal 3: Volatility filter ---
        atr_values = atr(candles, ATR_PERIOD)
        if len(atr_values) < 10:
            return None

        current_atr = float(atr_values[-1])
        avg_atr = float(np.mean(atr_values[-20:]))
        atr_ratio = current_atr / avg_atr if avg_atr > 0 else 1.0

        if atr_ratio > ATR_HIGH_MULTIPLIER:
            logger.info(
                "SafeFlow %s: volatility too high (ATR ratio %.2f) — skipping",
                symbol, atr_ratio,
            )
            return None

        # --- Confidence scoring ---
        # Deeper oversold = higher confidence
        confidence = 0
        if current_rsi < 25:
            confidence = 90
        elif current_rsi < 30:
            confidence = 75
        else:
            confidence = 60

        # Bonus if RSI is turning up (momentum shift)
        if current_rsi > prev_rsi:
            confidence = min(confidence + 10, 95)

        # Reduce confidence in higher volatility
        if atr_ratio > 1.5:
            confidence -= 10

        # Reduce position size in elevated volatility
        vol_multiplier = 1.0
        if atr_ratio > 1.3:
            vol_multiplier = 0.7
        elif atr_ratio > 1.0:
            vol_multiplier = 0.85

        adjusted_amount = amount * vol_multiplier
        quantity = adjusted_amount / current_price

        # Volume confirmation (bonus, not required)
        vol_r = volume_ratio(candles, 20)
        vol_note = ""
        if vol_r and vol_r > 1.2:
            confidence = min(confidence + 5, 95)
            vol_note = f", volume {vol_r:.1f}x avg"

        # Stop-loss and take-profit
        stop_loss = round(current_price * (1 - STOP_LOSS_PCT), 8)
        tp_levels = [
            {
                "percent": lv["percent"],
                "sellFraction": lv["fraction"],
                "targetPrice": round(current_price * (1 + lv["percent"] / 100), 8),
            }
            for lv in TP_LEVELS
        ]

        reason = (
            f"SafeFlow BUY: RSI {current_rsi:.0f} (oversold), "
            f"{trend_label}, ATR ratio {atr_ratio:.2f}{vol_note} "
            f"[confidence {confidence}%]"
        )

        logger.info("SafeFlow signal: %s %s — %s", "BUY", symbol, reason)

        return {
            "action": "BUY",
            "symbol": symbol,
            "amount": round(quantity, 8),
            "price": current_price,
            "quoteAmount": round(adjusted_amount, 2),
            "stopLoss": stop_loss,
            "takeProfit": tp_levels[1]["targetPrice"],  # mid-level for risk engine
            "takeProfitLevels": tp_levels,
            "confidence": confidence,
            "reason": reason,
            "strategy": "safeflow",
            "agentId": agent_id,
        }
