"""Trade execution service — supports both paper and live trading."""

import logging
import time
from typing import Any, Dict, Optional

import ccxt

import config

logger = logging.getLogger(__name__)


class TradeExecutor:
    """Places orders on exchanges (live) or simulates them (paper)."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute_trade(
        self,
        signal: Dict[str, Any],
        exchange_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Route a trade signal to the appropriate execution path.

        ``signal`` must contain at least: action, symbol, amount.
        ``exchange_config`` may include apiKey, secret, exchange id, and
        a ``mode`` override ("paper" | "live").

        Returns a result dict with status, filled price, etc.
        """
        mode = (exchange_config or {}).get("mode", config.TRADING_MODE)
        if mode == "live":
            return self._execute_live(signal, exchange_config or {})
        return self.simulate_trade(signal)

    def simulate_trade(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """Paper-trade: record the signal without touching a real exchange."""
        logger.info(
            "[PAPER] %s %s — amount: %s — reason: %s",
            signal.get("action"),
            signal.get("symbol"),
            signal.get("amount"),
            signal.get("reason", "n/a"),
        )
        return {
            "status": "simulated",
            "action": signal.get("action"),
            "symbol": signal.get("symbol"),
            "amount": signal.get("amount"),
            "price": signal.get("price"),
            "reason": signal.get("reason"),
            "timestamp": int(time.time() * 1000),
            "orderId": f"paper-{int(time.time() * 1000)}",
            "mode": "paper",
        }

    # ------------------------------------------------------------------
    # Internal — live execution
    # ------------------------------------------------------------------

    def _execute_live(
        self, signal: Dict[str, Any], exchange_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Place a real order on the exchange via ccxt."""
        exchange_id: str = exchange_config.get("exchange", config.EXCHANGE_DEFAULT)
        api_key: str = exchange_config.get("apiKey", "")
        api_secret: str = exchange_config.get("secret", "")

        if not api_key or not api_secret:
            logger.error("Live trading requires apiKey and secret in exchange_config")
            return {"status": "error", "message": "Missing exchange API credentials"}

        try:
            exchange_class = getattr(ccxt, exchange_id, None)
            if exchange_class is None:
                return {"status": "error", "message": f"Unknown exchange: {exchange_id}"}

            exchange: ccxt.Exchange = exchange_class({
                "apiKey": api_key,
                "secret": api_secret,
                "enableRateLimit": True,
            })

            symbol: str = signal["symbol"]
            action: str = signal["action"].upper()
            amount: float = float(signal["amount"])
            order_type: str = signal.get("orderType", "market")

            if action == "BUY":
                order = exchange.create_order(symbol, order_type, "buy", amount)
            elif action == "SELL":
                order = exchange.create_order(symbol, order_type, "sell", amount)
            else:
                return {"status": "error", "message": f"Unknown action: {action}"}

            logger.info("[LIVE] Order placed: %s %s %s — id: %s", action, amount, symbol, order.get("id"))

            return {
                "status": "executed",
                "action": action,
                "symbol": symbol,
                "amount": amount,
                "price": order.get("price") or order.get("average"),
                "orderId": order.get("id"),
                "timestamp": int(time.time() * 1000),
                "mode": "live",
                "raw": order,
            }

        except ccxt.InsufficientFunds:
            logger.error("Insufficient funds for %s %s", signal.get("action"), signal.get("symbol"))
            return {"status": "error", "message": "Insufficient funds"}
        except ccxt.InvalidOrder as exc:
            logger.error("Invalid order: %s", exc)
            return {"status": "error", "message": f"Invalid order: {exc}"}
        except ccxt.NetworkError:
            logger.error("Network error placing order on %s", exchange_id)
            return {"status": "error", "message": "Network error"}
        except ccxt.ExchangeError as exc:
            logger.error("Exchange error: %s", exc)
            return {"status": "error", "message": str(exc)}
        except Exception:
            logger.exception("Unexpected error executing live trade")
            return {"status": "error", "message": "Unexpected execution error"}
