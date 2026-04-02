"""Client for the Cladex Risk Engine API.

Every trade signal MUST pass through validate_trade() before execution.
If validation fails, the trade is blocked. No exceptions.
"""

import logging
from typing import Any, Dict, Optional

import requests

import config

logger = logging.getLogger(__name__)


class RiskClient:
    """Communicates with the backend risk engine endpoints."""

    def __init__(self, base_url: Optional[str] = None, secret: Optional[str] = None) -> None:
        self.base_url = (base_url or config.BACKEND_URL).rstrip("/")
        self.secret = secret or config.WORKER_SECRET
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-Worker-Auth": self.secret,
        })
        self.timeout = 15

    def validate_trade(self, trade_request: Dict[str, Any]) -> Dict[str, Any]:
        """Pre-trade validation. Returns the risk check result.

        CRITICAL: If 'allowed' is False, DO NOT EXECUTE THE TRADE.
        If the API call fails, default to BLOCKING the trade (fail-safe).
        """
        url = f"{self.base_url}/risk/validate"
        try:
            resp = self.session.post(url, json=trade_request, timeout=self.timeout)
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                "Risk check for %s %s: %s%s",
                trade_request.get("side"),
                trade_request.get("symbol"),
                "APPROVED" if result.get("allowed") else "BLOCKED",
                f" — {result.get('reason')}" if result.get("reason") else "",
            )
            return result
        except requests.ConnectionError:
            logger.error("Cannot reach risk engine at %s — BLOCKING trade (fail-safe)", url)
            return {"allowed": False, "reason": "Risk engine unreachable — trade blocked for safety", "warnings": []}
        except requests.HTTPError as exc:
            logger.error("Risk engine returned %s — BLOCKING trade", exc.response.status_code)
            try:
                body = exc.response.json()
                return {"allowed": False, "reason": body.get("error", "Risk validation failed"), "warnings": []}
            except Exception:
                return {"allowed": False, "reason": f"Risk engine error: HTTP {exc.response.status_code}", "warnings": []}
        except Exception:
            logger.exception("Unexpected error calling risk engine — BLOCKING trade")
            return {"allowed": False, "reason": "Risk engine error — trade blocked for safety", "warnings": []}

    def post_trade(self, user_id: str, agent_id: Optional[str], profit: float) -> Dict[str, Any]:
        """Post-trade check. Triggers cooldowns, drawdown locks, etc.

        Returns decisions made by the risk engine.
        Non-critical — failures are logged but don't block.
        """
        url = f"{self.base_url}/risk/post-trade"
        try:
            payload: Dict[str, Any] = {"userId": user_id, "profit": profit}
            if agent_id:
                payload["agentId"] = agent_id

            resp = self.session.post(url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            result = resp.json()

            decisions = result.get("decisions", [])
            for d in decisions:
                logger.warning("[RISK] %s: %s", d.get("type"), d.get("reason"))

            return result
        except Exception:
            logger.exception("Failed to run post-trade risk check")
            return {"decisions": []}
