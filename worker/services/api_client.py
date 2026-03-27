"""HTTP client for communicating with the Cladex Node.js backend."""

import logging
from typing import Any, Dict, List, Optional

import requests

import config

logger = logging.getLogger(__name__)


class ApiClient:
    """Handles all HTTP communication with the Cladex backend API."""

    def __init__(self, base_url: Optional[str] = None, secret: Optional[str] = None) -> None:
        self.base_url = (base_url or config.BACKEND_URL).rstrip("/")
        self.secret = secret or config.WORKER_SECRET
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-Worker-Auth": self.secret,
        })
        self.timeout = 15  # seconds

    # ------------------------------------------------------------------
    # Agents
    # ------------------------------------------------------------------

    def get_active_agents(self) -> List[Dict[str, Any]]:
        """Fetch all agents that are currently active and should be processed.

        Returns a list of agent config dicts, or an empty list on failure.
        """
        url = f"{self.base_url}/agents/active"
        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            agents: List[Dict[str, Any]] = data if isinstance(data, list) else data.get("agents", [])
            logger.info("Fetched %d active agent(s) from backend", len(agents))
            return agents
        except requests.ConnectionError:
            logger.error("Cannot reach backend at %s", url)
        except requests.HTTPError as exc:
            logger.error("Backend returned %s for GET %s", exc.response.status_code, url)
        except Exception:
            logger.exception("Unexpected error fetching active agents")
        return []

    # ------------------------------------------------------------------
    # Trade reporting
    # ------------------------------------------------------------------

    def report_trade(self, trade_data: Dict[str, Any]) -> bool:
        """Report an executed (or simulated) trade back to the backend.

        Returns True if the backend acknowledged the report.
        """
        url = f"{self.base_url}/trades/report"
        try:
            resp = self.session.post(url, json=trade_data, timeout=self.timeout)
            resp.raise_for_status()
            logger.info("Trade reported: %s %s", trade_data.get("action"), trade_data.get("symbol"))
            return True
        except requests.ConnectionError:
            logger.error("Cannot reach backend to report trade")
        except requests.HTTPError as exc:
            logger.error("Backend returned %s for POST %s", exc.response.status_code, url)
        except Exception:
            logger.exception("Unexpected error reporting trade")
        return False

    # ------------------------------------------------------------------
    # Activity logging
    # ------------------------------------------------------------------

    def log_activity(self, activity_data: Dict[str, Any]) -> bool:
        """Send an activity/log entry to the backend for audit purposes.

        Returns True on success.
        """
        url = f"{self.base_url}/activity/log"
        try:
            resp = self.session.post(url, json=activity_data, timeout=self.timeout)
            resp.raise_for_status()
            return True
        except requests.ConnectionError:
            logger.warning("Cannot reach backend to log activity")
        except requests.HTTPError as exc:
            logger.warning("Backend returned %s for activity log", exc.response.status_code)
        except Exception:
            logger.exception("Unexpected error logging activity")
        return False
