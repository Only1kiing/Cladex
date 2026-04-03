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

            # --- Enforce exchange minimum order size ---
            exchange.load_markets()
            market = exchange.market(symbol)
            limits = market.get("limits", {})

            # Always use a live ticker price for min-cost checks — the signal
            # price may be stale or missing entirely.
            ticker = exchange.fetch_ticker(symbol)
            current_price = ticker.get("last") or ticker.get("close") or 0

            min_amount = (limits.get("amount") or {}).get("min")
            min_cost = (limits.get("cost") or {}).get("min")

            # Check cost minimum first (most common Bybit rejection reason)
            if current_price > 0 and min_cost:
                order_cost = amount * current_price
                if order_cost < min_cost:
                    # Add 5% buffer so rounding / slippage doesn't drop below min
                    adjusted = (min_cost * 1.05) / current_price
                    adjusted = float(exchange.amount_to_precision(symbol, adjusted))
                    # Verify after precision rounding we still meet minimum
                    if adjusted * current_price < min_cost:
                        step = float(market.get("precision", {}).get("amount", 1e-8))
                        adjusted += step
                    logger.warning(
                        "Order cost $%.2f below exchange minimum $%.2f — adjusting amount %.8f → %.8f",
                        order_cost, min_cost, amount, adjusted,
                    )
                    amount = adjusted

            if min_amount and amount < min_amount:
                logger.warning(
                    "Order amount %.8f %s below exchange minimum %.8f — adjusting up",
                    amount, symbol, min_amount,
                )
                amount = min_amount

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
