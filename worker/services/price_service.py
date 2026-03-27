"""Price data service powered by ccxt."""

import logging
from typing import Any, Dict, List, Optional

import ccxt

import config

logger = logging.getLogger(__name__)


class PriceService:
    """Fetches live market data from crypto exchanges via ccxt."""

    def __init__(self) -> None:
        self._exchanges: Dict[str, ccxt.Exchange] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_exchange(self, exchange_id: str) -> ccxt.Exchange:
        """Return a cached ccxt exchange instance, creating one if needed."""
        if exchange_id not in self._exchanges:
            exchange_class = getattr(ccxt, exchange_id, None)
            if exchange_class is None:
                raise ValueError(f"Unknown exchange: {exchange_id}")
            self._exchanges[exchange_id] = exchange_class({"enableRateLimit": True})
            logger.debug("Initialized exchange: %s", exchange_id)
        return self._exchanges[exchange_id]

    @staticmethod
    def _normalise_symbol(symbol: str) -> str:
        """Ensure the symbol uses ccxt's 'BASE/QUOTE' format."""
        if "/" in symbol:
            return symbol.upper()
        # Best-effort: assume USDT quote for bare symbols like "BTC" or "BTCUSDT"
        sym = symbol.upper()
        for quote in ("USDT", "BUSD", "USD", "USDC"):
            if sym.endswith(quote):
                base = sym[: -len(quote)]
                return f"{base}/{quote}"
        return f"{sym}/USDT"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_price(
        self, symbol: str, exchange: Optional[str] = None
    ) -> Optional[float]:
        """Fetch the current last-traded price for *symbol*.

        Returns ``None`` on any failure so callers can decide how to proceed.
        """
        exchange_id = exchange or config.EXCHANGE_DEFAULT
        normalised = self._normalise_symbol(symbol)
        try:
            ex = self._get_exchange(exchange_id)
            ticker = ex.fetch_ticker(normalised)
            price: Optional[float] = ticker.get("last")
            if price is not None:
                logger.debug("%s price on %s: %s", normalised, exchange_id, price)
            return price
        except ccxt.NetworkError:
            logger.error("Network error fetching price for %s on %s", normalised, exchange_id)
        except ccxt.ExchangeError as exc:
            logger.error("Exchange error for %s on %s: %s", normalised, exchange_id, exc)
        except Exception:
            logger.exception("Unexpected error fetching price for %s", normalised)
        return None

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: str = "1h",
        limit: int = 50,
        exchange: Optional[str] = None,
    ) -> List[List[float]]:
        """Fetch OHLCV candlestick data.

        Each candle is ``[timestamp, open, high, low, close, volume]``.
        Returns an empty list on failure.
        """
        exchange_id = exchange or config.EXCHANGE_DEFAULT
        normalised = self._normalise_symbol(symbol)
        try:
            ex = self._get_exchange(exchange_id)
            candles: List[List[float]] = ex.fetch_ohlcv(
                normalised, timeframe=timeframe, limit=limit
            )
            logger.debug(
                "Fetched %d candles for %s (%s) on %s",
                len(candles), normalised, timeframe, exchange_id,
            )
            return candles
        except ccxt.NetworkError:
            logger.error("Network error fetching OHLCV for %s on %s", normalised, exchange_id)
        except ccxt.ExchangeError as exc:
            logger.error("Exchange error for OHLCV %s on %s: %s", normalised, exchange_id, exc)
        except Exception:
            logger.exception("Unexpected error fetching OHLCV for %s", normalised)
        return []

    def get_ticker(
        self, symbol: str, exchange: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch the full ticker dict (bid, ask, volume, etc.)."""
        exchange_id = exchange or config.EXCHANGE_DEFAULT
        normalised = self._normalise_symbol(symbol)
        try:
            ex = self._get_exchange(exchange_id)
            ticker: Dict[str, Any] = ex.fetch_ticker(normalised)
            return ticker
        except ccxt.NetworkError:
            logger.error("Network error fetching ticker for %s on %s", normalised, exchange_id)
        except ccxt.ExchangeError as exc:
            logger.error("Exchange error for ticker %s on %s: %s", normalised, exchange_id, exc)
        except Exception:
            logger.exception("Unexpected error fetching ticker for %s", normalised)
        return None
