"""Cladex Worker configuration — loads settings from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

# Backend API
BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:4000/api")
WORKER_SECRET: str = os.getenv("WORKER_SECRET", "")

# Scheduling
WORKER_INTERVAL: int = int(os.getenv("WORKER_INTERVAL", "60"))

# Exchange defaults
EXCHANGE_DEFAULT: str = os.getenv("EXCHANGE_DEFAULT", "binance")

# Trading mode — "paper" (simulated) or "live"
TRADING_MODE: str = os.getenv("TRADING_MODE", "paper")

# Logging
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
