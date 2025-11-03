# Local Testing Guide

Test the Fantasy Football Vegas Odds platform locally before deploying to Cloudflare.

## Quick Start

### Option 1: Test Workers Backend (Recommended)

```bash
# Terminal 1 - Backend Workers
cd backend-workers
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your API keys (or use placeholders for now)
npm run dev
# Backend runs on http://localhost:8787

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Option 2: Test FastAPI Backend (Alternative)

```bash
# Terminal 1 - Backend FastAPI
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API keys
uvicorn app.main:app --reload
# Backend runs on http://localhost:8000

# Terminal 2 - Frontend
cd frontend
npm install
# Create .env.local for FastAPI backend
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
# Frontend runs on http://localhost:5173
```

---

## Step-by-Step Setup

### 1. Backend Workers Setup

#### Install Dependencies
```bash
cd backend-workers
npm install
```

#### Configure Environment Variables
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```bash
# Option A: Use real API keys (recommended for full testing)
ODDS_API_KEY=your_real_odds_api_key
NFL_API_KEY=your_real_rapidapi_key
NFL_API_HOST=nfl-api-data.p.rapidapi.com

# Option B: Use placeholders (for UI testing only)
ODDS_API_KEY=test_key
NFL_API_KEY=test_key
NFL_API_HOST=nfl-api-data.p.rapidapi.com
```

**Note**: With placeholder keys, external API calls will fail, but you can still test:
- UI/UX
- Routing
- Database operations
- Internal calculations

#### Start Dev Server
```bash
npm run dev
```

You should see:
```
⛅️ wrangler 3.x.x
------------------
Your worker has access to the following bindings:
- D1 Databases:
  - DB: local-ffb-odds-db (...)
- KV Namespaces:
  - CACHE: local-kv (...)
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8787
```

#### Test Backend Endpoints

Open http://localhost:8787 in your browser:
```json
{
  "name": "Fantasy Football Vegas Odds API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "endpoints": {
    "leagues": "/api/v1/leagues",
    "matchups": "/api/v1/matchups",
    "odds": "/api/v1/odds",
    "efficiency": "/api/v1/efficiency"
  }
}
```

Test health check:
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-03T...",
  "environment": "development"
}
```

---

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure Environment

**For Workers Backend** (default):
```bash
# Create .env.local
echo "VITE_API_URL=http://localhost:8787" > .env.local
```

**For FastAPI Backend** (alternative):
```bash
echo "VITE_API_URL=http://localhost:8000" > .env.local
```

#### Start Dev Server
```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help
```

Open http://localhost:5173 in your browser.

---

## Testing Checklist

### ✅ Backend Tests (Workers)

1. **Health Check**
   ```bash
   curl http://localhost:8787/health
   ```
   ✅ Should return `{"status": "healthy"}`

2. **Root Endpoint**
   ```bash
   curl http://localhost:8787/
   ```
   ✅ Should return API info

3. **CORS Headers**
   ```bash
   curl -H "Origin: http://localhost:5173" -I http://localhost:8787/health
   ```
   ✅ Should include `Access-Control-Allow-Origin: *`

4. **Add League** (requires real API keys or will mock)
   ```bash
   curl -X POST "http://localhost:8787/api/v1/leagues?league_id=123456&season=2024"
   ```
   ✅ Should attempt to fetch from Yahoo (will fail with test keys, but shows endpoint works)

5. **List Leagues**
   ```bash
   curl http://localhost:8787/api/v1/leagues
   ```
   ✅ Should return empty array `[]` or any added leagues

### ✅ Frontend Tests

1. **Home Page**
   - Navigate to http://localhost:5173
   - ✅ Should see "Fantasy Football Vegas Odds" header
   - ✅ Form to add league should be visible
   - ✅ Features section should display

2. **Add League Flow** (requires real API keys)
   - Enter league ID: `123456`
   - Click "Add League"
   - ✅ Should redirect to dashboard (or show error if no real API keys)

3. **Dashboard Page**
   - Navigate to http://localhost:5173/dashboard
   - ✅ Should show "No leagues added yet" or list of leagues

4. **Matchups Page**
   - Navigate to http://localhost:5173/matchups
   - ✅ Should show "Please select a league from the dashboard"

5. **Rankings Page**
   - Navigate to http://localhost:5173/rankings
   - ✅ Should show "Please select a league from the dashboard"

### ✅ Integration Tests

1. **Network Requests**
   - Open browser DevTools → Network tab
   - Navigate through the app
   - ✅ API calls should go to `http://localhost:8787`
   - ✅ CORS should work (no CORS errors in console)

2. **Database** (Workers only)
   ```bash
   # Check local D1 database
   cd backend-workers
   npx wrangler d1 execute local-ffb-odds-db --local --command "SELECT * FROM leagues"
   ```
   ✅ Should show any leagues added

3. **Cache** (Workers only)
   - Add a league
   - Call the same endpoint again
   - ✅ Second call should be faster (cached)

---

## Testing Without Real API Keys

You can test most of the platform without API keys by using **mock data**.

### Create Mock Data Script

Create `backend-workers/scripts/seed-local.sql`:
```sql
-- Seed local database with test data

INSERT INTO leagues (league_id, name, platform, season, current_week, num_teams, scoring_type)
VALUES ('test_league_1', 'Test League', 'yahoo', 2024, 10, 12, 'ppr');

INSERT INTO teams (team_id, league_id, name, manager_name, wins, losses, ties, points_for, points_against)
VALUES
  ('team_1', 'test_league_1', 'Team Alpha', 'Manager A', 6, 3, 0, 950.5, 880.2),
  ('team_2', 'test_league_1', 'Team Beta', 'Manager B', 5, 4, 0, 920.3, 900.1),
  ('team_3', 'test_league_1', 'Team Gamma', 'Manager C', 7, 2, 0, 1020.8, 850.5);
```

Load mock data:
```bash
cd backend-workers
npx wrangler d1 execute local-ffb-odds-db --local --file=scripts/seed-local.sql
```

Now you can test:
- Dashboard (shows 1 league)
- Leagues API (returns test league)
- Database queries

---

## Common Issues & Solutions

### Issue: "Module not found"
```bash
cd backend-workers
npm install
```

### Issue: "D1 database not found"
Workers creates a local D1 automatically. If issues:
```bash
npx wrangler d1 execute local-ffb-odds-db --local --command "SELECT 1"
```

### Issue: "CORS error" in browser
- Check that Workers backend is running on port 8787
- Check `.env.local` has correct backend URL
- CORS is already configured in `src/index.ts`

### Issue: "API calls failing"
- Check browser DevTools → Console for errors
- Check Network tab for failed requests
- Verify backend is running and accessible

### Issue: Frontend not connecting to backend
Check `.env.local`:
```bash
cat frontend/.env.local
```
Should show:
```
VITE_API_URL=http://localhost:8787
```

Restart frontend after changing `.env.local`:
```bash
# Stop dev server (Ctrl+C)
npm run dev
```

---

## Local vs Production Differences

| Feature | Local (Wrangler Dev) | Production (Cloudflare) |
|---------|---------------------|-------------------------|
| **Database** | SQLite file | Cloudflare D1 |
| **KV Cache** | In-memory | Distributed KV |
| **Cron** | Manual trigger | Automatic (10am ET) |
| **URL** | localhost:8787 | your-subdomain.workers.dev |
| **Performance** | Development mode | Production optimized |
| **Secrets** | `.dev.vars` file | Wrangler secrets |

---

## Testing the Cron Job Locally

The daily update cron doesn't run automatically in local dev. Test manually:

```bash
# In backend-workers directory
npm run dev

# In another terminal, trigger the scheduled function
curl -X POST http://localhost:8787/__scheduled
```

This will run the `dailyUpdate()` function manually.

---

## Performance Testing

### Test Response Times
```bash
# Install httpie for better output
pip install httpie

# Test endpoints
http http://localhost:8787/health
http http://localhost:8787/api/v1/leagues
```

### Load Testing (optional)
```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 10 -d 5 http://localhost:8787/health
```

---

## Next Steps After Local Testing

Once everything works locally:

1. **Get Real API Keys**
   - The Odds API: https://the-odds-api.com/
   - NFL API: https://rapidapi.com/

2. **Deploy to Cloudflare**
   - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

3. **Monitor Production**
   - `wrangler tail` for real-time logs
   - Cloudflare dashboard for analytics

---

## Troubleshooting Commands

```bash
# Check Node version (need 18+)
node --version

# Check npm version
npm --version

# Check Wrangler version
npx wrangler --version

# View local D1 data
npx wrangler d1 execute local-ffb-odds-db --local --command "SELECT * FROM leagues"

# View local KV data (not easily accessible, but cache will work)

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart dev server with clean slate
pkill -f wrangler
npm run dev
```

---

## Questions?

- Check [README.md](./README.md) for overview
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment
- Check backend logs in terminal for errors
- Check browser DevTools console for frontend errors

Happy testing! 🧪
