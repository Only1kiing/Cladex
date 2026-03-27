# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cladex is an AI-powered crypto trading platform with three independent components:

- **frontend/** — Next.js 14 (React 18, TypeScript, Tailwind CSS) dashboard for managing trading agents
- **backend/** — Express.js (TypeScript) REST API with Prisma ORM on PostgreSQL
- **worker/** — Python background service that evaluates agent strategies and executes trades via ccxt

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev          # starts on localhost:3000
npm run build
npm run lint
```

### Backend (Express + Prisma)
```bash
cd backend
npm install
npm run dev                  # nodemon + ts-node, starts on localhost:4000
npm run build                # tsc
npm run prisma:generate      # regenerate Prisma client after schema changes
npm run prisma:migrate       # create/apply migrations (prisma migrate dev)
```

### Worker (Python)
```bash
cd worker
pip install -r requirements.txt
python main.py
```

## Environment Setup

Both `backend/.env` and `worker/.env` need to be created from their respective `.env.example` files.

Backend requires: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`
Worker requires: `BACKEND_URL`, `WORKER_SECRET`

## Architecture

### Data Flow
1. Users create and configure trading agents through the frontend dashboard
2. The backend stores agent configs, user data, trades, and activity logs in PostgreSQL (via Prisma)
3. The worker polls the backend (`GET /api/agents/active`) on a configurable interval, evaluates strategies, and executes trades
4. Trade results are reported back to the backend (`POST /api/trades/report`) and logged (`POST /api/activity/log`)

### Agent System
Agents have a **personality** (GUARDIAN, ANALYST, HUNTER, ORACLE) and a **risk level** (LOW, MEDIUM, HIGH). The AI service (`backend/src/services/ai.service.ts`) uses OpenAI GPT-4o to generate agent configurations from natural language prompts and to power conversational interactions with agents.

### Trading Strategies (worker/strategies/)
- **DCA** (`dca.py`) — Dollar-cost averaging based on current prices
- **Trend** (`trend.py`) — Trend following using OHLCV/candlestick data

The worker maps strategy names to implementations via `STRATEGY_MAP` in `main.py`. Trading mode defaults to "paper" (simulated); set `TRADING_MODE=live` for real exchange execution via ccxt.

### Worker ↔ Backend Auth
The worker authenticates to the backend using `X-Worker-Auth` header with the shared `WORKER_SECRET`.

### Frontend Auth
JWT-based. Token stored in `localStorage` as `cladex_token`. The frontend API client (`frontend/src/lib/api.ts`) auto-attaches Bearer tokens and redirects to `/login` on 401. Auth context is in `frontend/src/lib/auth.tsx`.

### API Routes (all prefixed `/api`)
- `/auth` — registration, login
- `/agents` — CRUD for trading agents
- `/trades` — trade history
- `/dashboard` — aggregated stats
- `/exchange` — exchange connection management
- `/ai` — AI agent generation and chat

### Database Schema (backend/prisma/schema.prisma)
Core models: User, Agent, Trade, Exchange, ActivityLog. Uses cuid IDs. Cascading deletes from User to dependent models.
