"""Dollar-Cost Averaging (DCA) strategy."""

import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class DCAStrategy:
    """Generates periodic BUY signals at fixed intervals.

    Agent config is expected to include:
        strategy_config.interval   – seconds between buys (e.g. 86400 for daily)
        strategy_config.amount     – USD (or quote) amount per buy
        strategy_config.assets     – list of symbols, e.g. ["BTC/USDT", "ETH/USDT"]
        last_trade_at              – epoch-ms timestamp of the agent's last trade (optional)
    """

    def evaluate(
        self,
        agent: Dict[str, Any],
        current_prices: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Return a list of trade signals (one per asset) if it is time to buy.

        ``current_prices`` maps each symbol to its latest price so the
        strategy can calculate the quantity.
        """
        strategy_cfg: Dict[str, Any] = agent.get("strategy_config") or agent.get("strategyConfig") or {}
        interval: int = int(strategy_cfg.get("interval", 86400))  # default 24 h
        amount: float = float(strategy_cfg.get("amount", 10))     # default $10
        assets: List[str] = strategy_cfg.get("assets", [])

        if not assets:
            logger.warning("DCA agent %s has no assets configured", agent.get("id", "?"))
            return []

        # Determine whether it is time for the next buy
        last_trade_at: Optional[int] = agent.get("last_trade_at") or agent.get("lastTradeAt")
        now_ms = int(time.time() * 1000)

        if last_trade_at is not None:
            elapsed_s = (now_ms - int(last_trade_at)) / 1000
            if elapsed_s < interval:
                next_in = interval - elapsed_s
                logger.debug(
                    "DCA agent %s: next buy in %.0f s",
                    agent.get("id", "?"), next_in,
                )
                return []

        # Time to buy — produce one signal per asset
        signals: List[Dict[str, Any]] = []
        for symbol in assets:
            price = current_prices.get(symbol)
            if price is None or price <= 0:
                logger.warning("No valid price for %s — skipping", symbol)
                continue

            quantity = amount / price
            signals.append({
                "action": "BUY",
                "symbol": symbol,
                "amount": round(quantity, 8),
                "price": price,
                "quoteAmount": amount,
                "reason": f"DCA buy — ${amount} of {symbol} at {price}",
                "strategy": "dca",
                "agentId": agent.get("id"),
            })

        if signals:
            logger.info("DCA agent %s: generated %d signal(s)", agent.get("id", "?"), len(signals))

        return signals
