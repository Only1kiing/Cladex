"""Cladex trading worker — main entry point.

Periodically fetches active agents from the backend, evaluates their
strategies, executes trades (paper by default), and reports results.
"""

import logging
import signal
import sys
import time
from typing import Any, Dict, List

import schedule

import config
from services.api_client import ApiClient
from services.price_service import PriceService
from services.trade_executor import TradeExecutor
from strategies.dca import DCAStrategy
from strategies.trend import TrendStrategy

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("cladex.worker")

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

_shutdown_requested = False

api_client = ApiClient()
price_service = PriceService()
trade_executor = TradeExecutor()

dca_strategy = DCAStrategy()
trend_strategy = TrendStrategy()

STRATEGY_MAP: Dict[str, str] = {
    "dca": "dca",
    "dollar_cost_average": "dca",
    "trend": "trend",
    "trend_following": "trend",
    "sma_crossover": "trend",
}

# ---------------------------------------------------------------------------
# Core loop
# ---------------------------------------------------------------------------


def _collect_prices(symbols: List[str]) -> Dict[str, float]:
    """Fetch current prices for a list of symbols."""
    prices: Dict[str, float] = {}
    for sym in symbols:
        price = price_service.get_price(sym)
        if price is not None:
            prices[sym] = price
    return prices


def _collect_ohlcv(symbols: List[str], timeframe: str = "1h", limit: int = 50) -> Dict[str, List[List[float]]]:
    """Fetch OHLCV data for a list of symbols."""
    data: Dict[str, List[List[float]]] = {}
    for sym in symbols:
        candles = price_service.get_ohlcv(sym, timeframe=timeframe, limit=limit)
        if candles:
            data[sym] = candles
    return data


def _get_agent_assets(agent: Dict[str, Any]) -> List[str]:
    """Extract the list of asset symbols from an agent config."""
    cfg = agent.get("strategy_config") or agent.get("strategyConfig") or {}
    return cfg.get("assets", [])


def process_agent(agent: Dict[str, Any]) -> None:
    """Evaluate one agent's strategy and execute any resulting trades."""
    agent_id: str = agent.get("id", agent.get("_id", "unknown"))
    strategy_key: str = STRATEGY_MAP.get(
        (agent.get("strategy") or "").lower(), ""
    )

    if not strategy_key:
        logger.warning("Agent %s has unknown strategy '%s' — skipping", agent_id, agent.get("strategy"))
        return

    assets = _get_agent_assets(agent)
    if not assets:
        logger.warning("Agent %s has no assets configured — skipping", agent_id)
        return

    exchange_config: Dict[str, Any] = agent.get("exchange_config") or agent.get("exchangeConfig") or {}
    signals: List[Dict[str, Any]] = []

    try:
        if strategy_key == "dca":
            prices = _collect_prices(assets)
            signals = dca_strategy.evaluate(agent, prices)

        elif strategy_key == "trend":
            ohlcv = _collect_ohlcv(assets)
            signals = trend_strategy.evaluate(agent, ohlcv)

    except Exception:
        logger.exception("Error evaluating strategy for agent %s", agent_id)
        api_client.log_activity({
            "agentId": agent_id,
            "type": "error",
            "message": "Strategy evaluation failed",
        })
        return

    if not signals:
        logger.debug("Agent %s: no trade signals", agent_id)
        return

    # Execute each signal
    for sig in signals:
        try:
            result = trade_executor.execute_trade(sig, exchange_config)

            # Report to backend
            trade_report = {
                **sig,
                **result,
                "agentId": agent_id,
            }
            api_client.report_trade(trade_report)

            api_client.log_activity({
                "agentId": agent_id,
                "type": "trade",
                "message": f"{result.get('status', '?').upper()}: {sig['action']} {sig['symbol']}",
                "details": result,
            })

        except Exception:
            logger.exception("Error executing trade for agent %s: %s", agent_id, sig)
            api_client.log_activity({
                "agentId": agent_id,
                "type": "error",
                "message": f"Trade execution failed for {sig.get('symbol', '?')}",
            })


def run_cycle() -> None:
    """Single worker cycle — fetch agents, evaluate, trade, report."""
    logger.info("=== Worker cycle started ===")
    start = time.time()

    agents = api_client.get_active_agents()
    if not agents:
        logger.info("No active agents — nothing to do")
        return

    for agent in agents:
        if _shutdown_requested:
            logger.info("Shutdown requested — aborting cycle")
            break
        process_agent(agent)

    elapsed = time.time() - start
    logger.info("=== Worker cycle finished in %.2f s ===", elapsed)


# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------


def _handle_signal(signum: int, _frame: Any) -> None:
    global _shutdown_requested
    sig_name = signal.Signals(signum).name if hasattr(signal, "Signals") else str(signum)
    logger.info("Received %s — shutting down gracefully", sig_name)
    _shutdown_requested = True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    logger.info("Cladex Worker starting (interval=%ds, mode=%s)", config.WORKER_INTERVAL, config.TRADING_MODE)

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    # Run immediately on start, then on schedule
    run_cycle()

    schedule.every(config.WORKER_INTERVAL).seconds.do(run_cycle)

    while not _shutdown_requested:
        schedule.run_pending()
        time.sleep(1)

    logger.info("Cladex Worker stopped")


if __name__ == "__main__":
    main()
