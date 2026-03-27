# Cladex

AI-powered crypto trading platform. Deploy autonomous trading agents with distinct personalities, strategies, and risk profiles — all non-custodial.

## How It Works

1. **Create an agent** — Describe what you want in plain English, and AI generates a full trading configuration (personality, strategy, risk level, assets).
2. **Agents trade for you** — A background worker evaluates strategies on a schedule, executing trades via exchange APIs (paper or live).
3. **Monitor everything** — Real-time dashboard with P&L tracking, activity feeds, and agent chat.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │◄────►│   Backend    │◄────►│   Worker     │
│  Next.js 14  │      │  Express.js  │      │   Python     │
│  Tailwind    │      │  Prisma/PG   │      │   ccxt       │
│  port 3000   │      │  port 4000   │      │  scheduled   │
└─────────────┘      └──────────────┘      └──────────────┘
```

- **Frontend** — Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts
- **Backend** — Express.js, TypeScript, Prisma ORM, PostgreSQL, OpenAI GPT-4o, JWT auth
- **Worker** — Python, ccxt (exchange connectivity), schedule, numpy

## Agent Personalities

| Personality | Style | Risk |
|-------------|-------|------|
| **Guardian** | Conservative, capital preservation | Low |
| **Analyst** | Data-driven, technical analysis | Medium |
| **Hunter** | Aggressive, high-reward seeker | High |
| **Oracle** | Sentiment-based, macro analysis | Variable |

## Trading Strategies

- **DCA** — Dollar-cost averaging based on current prices
- **Trend Following** — SMA crossover using OHLCV candlestick data

Both strategies support paper trading (default) and live execution via ccxt-supported exchanges (Binance, Coinbase, Kraken, etc.).

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL

### Setup

```bash
# Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev

# Worker
cd worker
cp .env.example .env        # fill in BACKEND_URL, WORKER_SECRET
pip install -r requirements.txt
python main.py
```

### Environment Variables

**Backend** (`backend/.env`):
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `OPENAI_API_KEY` | OpenAI API key for agent AI features |
| `PORT` | Server port (default: 4000) |
| `CORS_ORIGIN` | Allowed frontend origin |

**Worker** (`worker/.env`):
| Variable | Description |
|----------|-------------|
| `BACKEND_URL` | Backend API URL |
| `WORKER_SECRET` | Shared secret for worker auth |
| `TRADING_MODE` | `paper` (default) or `live` |
| `WORKER_INTERVAL` | Seconds between cycles (default: 60) |
| `EXCHANGE_DEFAULT` | Default exchange (default: binance) |

## Pricing Model

- **Free** — 1 agent, basic DCA strategy
- **Agent Mint** — $20 per additional agent, all strategies, on-chain NFT ownership
- **Pro** — $29/mo, unlimited agents, marketplace access, 5% performance fee

## License

Proprietary. All rights reserved.
