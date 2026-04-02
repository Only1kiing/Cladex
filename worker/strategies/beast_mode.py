"""BEAST MODE X — Smart money alpha hunter.

Detects explosive breakout setups by combining:
1. Price compression (tight consolidation / Bollinger squeeze)
2. Volume accumulation (gradually increasing volume)
3. Breakout impulse (sudden directional move with strength)

Entry: Tight range + rising volume + breakout candle
Exit:  Scale out at +3%, +5%, +10%. Cut on fake breakout.
Edge:  Catches the beginning of big moves before the crowd.
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from strategies.indicators import (
    extract_closes,
    extract_volumes,
    ema,
    rsi,
    atr,
    bollinger_bands,
    volume_ratio,
    volume_trend,
    price_range_percent,
    is_breakout,
)

logger = logging.getLogger(__name__)

# Defaults
COMPRESSION_THRESHOLD = 8.0     # Price range < 8% = tight consolidation
BB_SQUEEZE_THRESHOLD = 0.03     # Bollinger width < 3% of price = squeeze
VOL_TREND_MIN = 0.02            # Volume slope must be positive
BREAKOUT_MIN_STRENGTH = 0.5     # Breakout > 0.5% above range
ATR_PERIOD = 14
RSI_PERIOD = 14
DEFAULT_AMOUNT = 10.0
STOP_LOSS_PCT = 0.035           # 3.5%
TP_LEVELS = [
    {"percent": 3, "fraction": 0.33},
    {"percent": 5, "fraction": 0.33},
    {"percent": 10, "fraction": 0.34},
]


class BeastModeStrategy:
    """Aggressive breakout hunter for explosive altcoin moves."""

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
        risk_level = (agent.get("riskLevel") or "HIGH").upper()

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
        if not candles or len(candles) < 30:
            logger.debug(
                "BeastMode: not enough data for %s (%d candles)",
                symbol, len(candles) if candles else 0,
            )
            return None

        closes = extract_closes(candles)
        current_price = float(closes[-1])
        if current_price <= 0:
            return None

        # ================================================================
        # SIGNAL 1: Price compression (consolidation detection)
        # ================================================================
        compression_score = 0

        # Method A: Raw price range
        range_pct = price_range_percent(candles, lookback=20)
        if range_pct is not None and range_pct < COMPRESSION_THRESHOLD:
            compression_score += 1
            logger.debug("BeastMode %s: price range %.1f%% (compressed)", symbol, range_pct)

        # Method B: Bollinger Band squeeze
        upper, middle, lower = bollinger_bands(closes, period=20, num_std=2.0)
        bb_squeeze = False
        if len(upper) > 0 and len(lower) > 0:
            bb_width = (float(upper[-1]) - float(lower[-1])) / current_price
            if bb_width < BB_SQUEEZE_THRESHOLD:
                compression_score += 1
                bb_squeeze = True
                logger.debug("BeastMode %s: BB squeeze (width %.2f%%)", symbol, bb_width * 100)

        # Method C: Decreasing ATR (volatility contracting)
        atr_values = atr(candles, ATR_PERIOD)
        atr_contracting = False
        if len(atr_values) > 10:
            recent_atr = float(np.mean(atr_values[-5:]))
            older_atr = float(np.mean(atr_values[-15:-5]))
            if older_atr > 0 and recent_atr < older_atr * 0.85:
                compression_score += 1
                atr_contracting = True

        if compression_score < 1:
            logger.debug("BeastMode %s: no compression detected", symbol)
            return None

        # ================================================================
        # SIGNAL 2: Volume accumulation (smart money loading)
        # ================================================================
        vol_accumulation_score = 0

        # Volume trending up
        vol_t = volume_trend(candles, lookback=10)
        if vol_t is not None and vol_t > VOL_TREND_MIN:
            vol_accumulation_score += 1

        # Current volume above average
        vol_r = volume_ratio(candles, 20)
        if vol_r is not None and vol_r > 1.0:
            vol_accumulation_score += 1

        # Volume increasing while price is flat = accumulation signature
        if vol_t is not None and vol_t > 0.05 and range_pct is not None and range_pct < 6:
            vol_accumulation_score += 1

        if vol_accumulation_score < 1:
            logger.debug("BeastMode %s: no volume accumulation", symbol)
            return None

        # ================================================================
        # SIGNAL 3: Breakout impulse
        # ================================================================
        breakout_dir, breakout_strength = is_breakout(candles, lookback=20)

        if breakout_dir is None or breakout_strength < BREAKOUT_MIN_STRENGTH:
            logger.debug(
                "BeastMode %s: no breakout (dir=%s, strength=%.2f%%)",
                symbol, breakout_dir, breakout_strength,
            )
            return None

        action = "BUY" if breakout_dir == "up" else "SELL"

        # --- Candle strength check ---
        # The breakout candle should have body > 60% of its range
        last_candle = candles[-1]
        c_open, c_high, c_low, c_close = last_candle[1], last_candle[2], last_candle[3], last_candle[4]
        candle_range = c_high - c_low
        candle_body = abs(c_close - c_open)
        if candle_range > 0:
            body_ratio = candle_body / candle_range
            if body_ratio < 0.4:
                logger.debug("BeastMode %s: weak candle body (%.0f%%)", symbol, body_ratio * 100)
                return None
        else:
            return None

        # --- RSI sanity check ---
        rsi_values = rsi(closes, RSI_PERIOD)
        current_rsi = 50.0
        if len(rsi_values) > 0:
            current_rsi = float(rsi_values[-1])
            # Don't buy into extreme overbought, don't sell into extreme oversold
            if action == "BUY" and current_rsi > 80:
                return None
            if action == "SELL" and current_rsi < 20:
                return None

        # ================================================================
        # Confidence scoring
        # ================================================================
        confidence = 40

        # Compression quality
        confidence += compression_score * 10
        if bb_squeeze:
            confidence += 5
        if atr_contracting:
            confidence += 5

        # Volume quality
        confidence += vol_accumulation_score * 8

        # Breakout strength
        if breakout_strength > 2.0:
            confidence += 15
        elif breakout_strength > 1.0:
            confidence += 10
        elif breakout_strength > 0.5:
            confidence += 5

        # Candle body strength
        if candle_range > 0 and body_ratio > 0.7:
            confidence += 5

        # Volume on breakout candle
        if vol_r is not None and vol_r > 2.0:
            confidence += 10
        elif vol_r is not None and vol_r > 1.5:
            confidence += 5

        confidence = min(confidence, 95)

        # Minimum confidence gate
        min_conf = 65 if risk_level == "LOW" else 55 if risk_level == "MEDIUM" else 50
        if confidence < min_conf:
            logger.debug("BeastMode %s: confidence %d below threshold %d", symbol, confidence, min_conf)
            return None

        # ================================================================
        # Position sizing and risk parameters
        # ================================================================
        # Beast mode sizes up on high confidence
        size_multiplier = 1.0
        if risk_level == "HIGH" and confidence > 75:
            size_multiplier = 1.3
        elif confidence < 60:
            size_multiplier = 0.7

        adjusted_amount = amount * size_multiplier
        quantity = adjusted_amount / current_price

        # ATR-based stop loss
        stop_pct = STOP_LOSS_PCT
        if len(atr_values) > 0:
            cur_atr = float(atr_values[-1])
            atr_stop = (cur_atr * 1.5) / current_price
            stop_pct = max(min(atr_stop, 0.08), 0.02)  # Bound: 2% to 8%

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

        # Build reason
        signals_hit = []
        if compression_score >= 2:
            signals_hit.append("strong compression")
        else:
            signals_hit.append("compression detected")
        if vol_accumulation_score >= 2:
            signals_hit.append("volume accumulating")
        signals_hit.append(f"breakout {breakout_dir} +{breakout_strength:.1f}%")

        reason = (
            f"BeastMode {action}: {', '.join(signals_hit)}, "
            f"RSI {current_rsi:.0f}, volume {vol_r:.1f}x avg "
            f"[confidence {confidence}%]"
        )

        logger.info("BeastMode signal: %s %s — %s", action, symbol, reason)

        return {
            "action": action,
            "symbol": symbol,
            "amount": round(quantity, 8),
            "price": current_price,
            "quoteAmount": round(adjusted_amount, 2),
            "stopLoss": stop_loss,
            "takeProfit": tp_levels[1]["targetPrice"],
            "takeProfitLevels": tp_levels,
            "confidence": confidence,
            "reason": reason,
            "strategy": "beast_mode",
            "agentId": agent_id,
        }
