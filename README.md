# Fantasy Football Vegas Odds Platform

A platform that combines fantasy football with Vegas odds to provide matchup predictions, win probabilities, and team efficiency rankings.

## Features

- **Yahoo League Integration** - Import public league data
- **Vegas Odds Integration** - Real NFL odds from The Odds API
- **Hybrid Projections** - Combine player props + team totals to project fantasy points
- **Matchup Odds** - Vegas-style moneyline odds for fantasy matchups
- **Efficiency Rankings** - Expected wins vs actual wins (KenPom-style for fantasy)
- **Daily Updates** - Automated updates at 10am ET via Cron Triggers

## Tech Stack

### Production (Cloudflare)
- **Frontend**: React + Vite on Cloudflare Pages
- **Backend**: TypeScript + Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Workers KV
- **Scheduler**: Cron Triggers

### Legacy (Local Development)
- **Backend**: Python + FastAPI (see `/backend` directory)

## Project Structure

```
ffb-odds/
├── frontend/          # React application
├── backend-workers/   # Cloudflare Workers (TypeScript + Hono)
├── backend/           # Legacy FastAPI server (for local dev)
├── database/          # Database schemas
├── DEPLOYMENT.md      # Full deployment guide
└── README.md
```

## Quick Start

### Option 1: Deploy to Cloudflare (Recommended)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment guide.

**TL;DR:**
```bash
# Backend
cd backend-workers
npm install
wrangler d1 create ffb-odds-db
wrangler d1 execute ffb-odds-db --file=../database/schema.sql
wrangler secret put ODDS_API_KEY
wrangler secret put NFL_API_KEY
npm run deploy

# Frontend
cd frontend
npm install
npm run build
# Deploy via Cloudflare Pages dashboard (connect to GitHub)
```

### Option 2: Local Development

#### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Workers (Local)
```bash
cd backend-workers
npm install
cp .dev.vars.example .dev.vars
# Add your API keys to .dev.vars
npm run dev
```

## Environment Variables

### Backend Workers (Production)
Set via `wrangler secret put`:
- `ODDS_API_KEY` - The Odds API key
- `NFL_API_KEY` - RapidAPI key
- `NFL_API_HOST` - nfl-api-data.p.rapidapi.com

### Frontend
**`.env.production`**:
```
VITE_API_URL=https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev
```

## API Keys

- Get The Odds API key: https://the-odds-api.com/ (500 free requests/month)
- Get NFL API key: https://rapidapi.com/Creativesdev/api/nfl-api-data

## Development

### Local URLs
- **Backend (FastAPI)**: http://localhost:8000
- **Backend (Workers)**: http://localhost:8787
- **Frontend**: http://localhost:5173

### Production URLs
- **Backend**: https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev
- **Frontend**: https://ffb-odds.pages.dev

## Deployment

Full deployment guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Costs

**$0/month** when deployed to Cloudflare (within free tier limits):
- Workers: 100,000 requests/day
- D1: 5M reads/day, 100K writes/day
- Pages: Unlimited
- KV: 100,000 reads/day
- Cron: Included

## License

MIT
