# Fantasy Football Vegas Odds - Workers Backend

TypeScript + Hono backend running on Cloudflare Workers.

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your API keys

# Run dev server
npm run dev

# Test at http://localhost:8787
```

### Deploy to Production

```bash
# First time setup
wrangler d1 create ffb-odds-db
wrangler kv:namespace create CACHE
# Update wrangler.toml with IDs

# Initialize database
wrangler d1 execute ffb-odds-db --file=../database/schema.sql

# Set secrets
wrangler secret put ODDS_API_KEY
wrangler secret put NFL_API_KEY
wrangler secret put NFL_API_HOST

# Deploy
npm run deploy
```

See [DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.

## Project Structure

```
src/
├── index.ts              # Main entry point
├── models/
│   └── schemas.ts        # Zod schemas & types
├── routes/
│   ├── leagues.ts        # League endpoints
│   ├── matchups.ts       # Matchup endpoints
│   ├── odds.ts           # Odds endpoints
│   └── efficiency.ts     # Efficiency endpoints
├── services/
│   ├── yahoo.ts          # Yahoo API integration
│   ├── oddsApi.ts        # The Odds API
│   ├── nflApi.ts         # NFL API
│   ├── projections.ts    # Projection engine
│   ├── efficiency.ts     # Efficiency calculator
│   ├── matchupOdds.ts    # Odds generator
│   └── cache.ts          # KV caching
├── db/
│   └── queries.ts        # D1 database queries
└── scheduled/
    └── dailyUpdate.ts    # Cron job handler
```

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/v1/leagues` - Add league
- `GET /api/v1/leagues` - List leagues
- `GET /api/v1/leagues/:id` - Get league details
- `GET /api/v1/matchups/league/:id` - Get matchups
- `GET /api/v1/odds/league/:id/week/:week` - Get matchup odds
- `GET /api/v1/odds/nfl/week/:week` - Get NFL odds
- `GET /api/v1/efficiency/league/:id` - Get efficiency rankings

## Tech Stack

- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Cache**: Workers KV
- **Validation**: Zod
- **Language**: TypeScript

## Scripts

- `npm run dev` - Start local dev server
- `npm run deploy` - Deploy to Cloudflare
- `npm run typecheck` - Run TypeScript type checking
- `npm run d1:create` - Create D1 database
- `npm run d1:init` - Initialize database schema

## Environment Variables

### Secrets (via `wrangler secret put`)
- `ODDS_API_KEY` - The Odds API key
- `NFL_API_KEY` - RapidAPI key for NFL data
- `NFL_API_HOST` - RapidAPI host

### Variables (in wrangler.toml)
- `ENVIRONMENT` - Environment name
- `CURRENT_SEASON` - Current NFL season
- `DEFAULT_WEEK` - Current week

## License

MIT
