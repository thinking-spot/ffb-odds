# Deployment Guide - Cloudflare Full Stack

This guide covers deploying the Fantasy Football Vegas Odds platform on Cloudflare's free tier.

## Stack Overview

- **Frontend**: Cloudflare Pages (React + Vite)
- **Backend**: Cloudflare Workers (TypeScript + Hono)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Workers KV
- **Scheduler**: Cron Triggers (10am ET daily)

---

## Prerequisites

1. **Cloudflare Account** (free tier)
   - Sign up at https://dash.cloudflare.com/sign-up

2. **Wrangler CLI** (Cloudflare's CLI tool)
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **API Keys** (get these first!)
   - The Odds API: https://the-odds-api.com/
   - NFL API (RapidAPI): https://rapidapi.com/Creativesdev/api/nfl-api-data

4. **Node.js 18+** and **npm**

---

## Step 1: Deploy Backend (Cloudflare Workers)

### 1.1 Install Dependencies

```bash
cd backend-workers
npm install
```

### 1.2 Create Cloudflare D1 Database

```bash
# Create the database
wrangler d1 create ffb-odds-db

# Copy the database_id from output, update wrangler.toml
# Replace "TBD" with your actual database_id
```

Update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "ffb-odds-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"  # From previous command
```

### 1.3 Initialize Database Schema

```bash
# Run the schema SQL
wrangler d1 execute ffb-odds-db --file=../database/schema.sql
```

### 1.4 Create KV Namespace

```bash
# Create KV namespace for caching
wrangler kv:namespace create CACHE

# Copy the id from output, update wrangler.toml
```

Update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "PASTE_YOUR_KV_ID_HERE"  # From previous command
```

### 1.5 Set Secrets

```bash
# Add your API keys as secrets
wrangler secret put ODDS_API_KEY
# Paste your Odds API key when prompted

wrangler secret put NFL_API_KEY
# Paste your RapidAPI key when prompted

wrangler secret put NFL_API_HOST
# Enter: nfl-api-data.p.rapidapi.com
```

### 1.6 Test Locally

```bash
# Copy dev vars
cp .dev.vars.example .dev.vars

# Edit .dev.vars and add your API keys

# Run dev server
npm run dev

# Test at http://localhost:8787
```

### 1.7 Deploy to Production

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Note the deployed URL (e.g., https://ffb-odds-api.your-subdomain.workers.dev)
```

---

## Step 2: Deploy Frontend (Cloudflare Pages)

### 2.1 Update Frontend Config

Edit `frontend/.env.production`:
```env
VITE_API_URL=https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev
```

Replace `YOUR_SUBDOMAIN` with your actual Workers URL from Step 1.7.

### 2.2 Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 2.3 Deploy to Cloudflare Pages

#### Option A: GitHub Integration (Recommended)

1. Push your code to GitHub (already done)
2. Go to https://dash.cloudflare.com/ → Pages → Create a project
3. Connect to your GitHub repository: `thinking-spot/ffb-odds`
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
5. Add environment variable:
   - `VITE_API_URL` = `https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev`
6. Click "Save and Deploy"

#### Option B: Direct Upload

```bash
cd frontend

# Deploy with wrangler
npx wrangler pages deploy dist --project-name ffb-odds
```

---

## Step 3: Verify Deployment

### 3.1 Test Backend API

```bash
# Health check
curl https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev/health

# Test endpoints
curl https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev/api/v1/leagues
```

### 3.2 Test Frontend

Visit your Cloudflare Pages URL:
```
https://ffb-odds.pages.dev
```

### 3.3 Test Full Flow

1. Add a Yahoo league via the frontend
2. Check database: `wrangler d1 execute ffb-odds-db --command "SELECT * FROM leagues"`
3. View odds on frontend

---

## Step 4: Configure Cron Trigger

The cron is already configured in `wrangler.toml`:
```toml
[triggers]
crons = ["0 15 * * *"]  # 3pm UTC = 10am EST / 11am EDT
```

To test manually:
```bash
# Trigger a cron job manually (for testing)
curl -X POST https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev/__scheduled?cron=0+15+*+*+*
```

---

## Step 5: Update Current Week

As the NFL season progresses, update the current week:

```bash
# Update via wrangler
wrangler secret put DEFAULT_WEEK
# Enter the new week number when prompted
```

Or update `wrangler.toml`:
```toml
[vars]
DEFAULT_WEEK = "11"  # Update this each week
```

Then redeploy:
```bash
cd backend-workers
npm run deploy
```

---

## Environment Variables Summary

### Backend (Workers) - Secrets
- `ODDS_API_KEY` - Your The Odds API key
- `NFL_API_KEY` - Your RapidAPI key
- `NFL_API_HOST` - `nfl-api-data.p.rapidapi.com`

### Backend (Workers) - Variables
- `ENVIRONMENT` - `production`
- `CURRENT_SEASON` - `2024`
- `DEFAULT_WEEK` - Current NFL week

### Frontend (Pages)
- `VITE_API_URL` - Your Workers backend URL

---

## Monitoring & Logs

### View Worker Logs
```bash
# Real-time logs
wrangler tail

# Or view in dashboard
https://dash.cloudflare.com/ → Workers & Pages → ffb-odds-api → Logs
```

### View Cron Execution
```bash
# Check recent cron runs
wrangler tail --format pretty
```

### Database Queries
```bash
# Query database
wrangler d1 execute ffb-odds-db --command "SELECT COUNT(*) FROM leagues"

# List all leagues
wrangler d1 execute ffb-odds-db --command "SELECT * FROM leagues"
```

---

## Costs & Limits (Free Tier)

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Workers | 100,000 req/day | ~1,000-5,000/day ✅ |
| D1 Database | 5M reads/day, 100K writes/day | ~10K reads, ~1K writes ✅ |
| Pages | Unlimited requests | Any ✅ |
| KV | 100,000 reads/day, 1,000 writes/day | ~5,000 reads, ~100 writes ✅ |
| Cron Triggers | Included | 1/day ✅ |

**Total Cost: $0/month** (within free tier limits)

---

## Troubleshooting

### "Database not found"
```bash
# Verify D1 database exists
wrangler d1 list

# Re-run schema
wrangler d1 execute ffb-odds-db --file=../database/schema.sql
```

### "Secret not found"
```bash
# Re-add secret
wrangler secret put ODDS_API_KEY
```

### "CORS error"
- Ensure Workers URL is correctly set in frontend `.env.production`
- Verify CORS is configured in `backend-workers/src/index.ts`

### "Cron not running"
```bash
# Check cron schedule
wrangler deployments list

# Manually trigger
curl -X POST https://ffb-odds-api.YOUR_SUBDOMAIN.workers.dev/__scheduled
```

### "Out of API quota"
- The Odds API free tier: 500 requests/month
- NFL API free tier: varies by endpoint
- Consider caching more aggressively if hitting limits

---

## Maintenance

### Update Dependencies
```bash
cd backend-workers
npm update

cd ../frontend
npm update
```

### Update Schema
```bash
# Modify database/schema.sql
# Then run migrations
wrangler d1 execute ffb-odds-db --file=../database/schema.sql
```

### Backup Database
```bash
# Export all data
wrangler d1 execute ffb-odds-db --command "SELECT * FROM leagues" --json > backup-leagues.json
```

---

## Next Steps

1. ✅ Deploy backend to Workers
2. ✅ Deploy frontend to Pages
3. ✅ Configure cron triggers
4. ✅ Add your first league
5. ✅ Monitor logs and verify daily updates
6. (Optional) Set up custom domain
7. (Optional) Add analytics (Cloudflare Web Analytics)

---

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/

Need help? Check the GitHub issues or Cloudflare Community forums.
