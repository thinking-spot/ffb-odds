# Quick Test Commands

Copy and paste these commands to test the platform locally.

## Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version
npm --version
```

---

## Backend Workers Setup

```bash
# Navigate to backend-workers
cd backend-workers

# Install dependencies
npm install

# Configure environment (edit .dev.vars with your API keys)
# Already created with placeholders

# Start dev server
npm run dev
```

**Expected Output:**
```
⛅️ wrangler 3.x.x
Your worker has access to the following bindings:
- D1 Databases: DB
- KV Namespaces: CACHE
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8787
```

**Keep this terminal open!**

---

## Frontend Setup (New Terminal)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Keep this terminal open!**

---

## Quick Tests

### Test 1: Backend Health Check
```bash
curl http://localhost:8787/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-03T...",
  "environment": "development"
}
```

### Test 2: Backend Root
```bash
curl http://localhost:8787/
```

**Expected:**
```json
{
  "name": "Fantasy Football Vegas Odds API",
  "version": "1.0.0",
  "status": "running",
  ...
}
```

### Test 3: Frontend
Open browser: **http://localhost:5173**

**Expected:**
- See "Fantasy Football Vegas Odds" header
- See league input form
- See features section

### Test 4: API Integration
1. Open browser DevTools → Network tab
2. Navigate to http://localhost:5173/dashboard
3. Check Network tab - should see call to `http://localhost:8787/api/v1/leagues`

---

## Testing with Mock Data (No API Keys Needed)

Create test data:

```bash
cd backend-workers

# Create a SQL file with test data
cat > test-data.sql << 'EOF'
INSERT INTO leagues (league_id, name, platform, season, current_week, num_teams, scoring_type)
VALUES ('test123', 'Test League', 'yahoo', 2024, 10, 12, 'ppr');

INSERT INTO teams (team_id, league_id, name, manager_name, wins, losses, ties, points_for, points_against)
VALUES
  ('team1', 'test123', 'Team Alpha', 'Manager A', 6, 3, 0, 950.5, 880.2),
  ('team2', 'test123', 'Team Beta', 'Manager B', 5, 4, 0, 920.3, 900.1);
EOF

# Load test data into local D1
npx wrangler d1 execute local-ffb-odds-db --local --file=test-data.sql
```

Now refresh http://localhost:5173/dashboard - you should see the test league!

---

## Verify Everything Works

### ✅ Checklist

- [ ] Backend running on http://localhost:8787
- [ ] Frontend running on http://localhost:5173
- [ ] Health check returns "healthy"
- [ ] Frontend loads without errors
- [ ] Dashboard page accessible
- [ ] Matchups page accessible
- [ ] Rankings page accessible
- [ ] No CORS errors in browser console
- [ ] API calls visible in Network tab

---

## Common Issues

### "Cannot find module"
```bash
cd backend-workers
rm -rf node_modules
npm install
```

### "Port already in use"
```bash
# Kill process on port 8787
lsof -ti:8787 | xargs kill -9

# Or use different port
npx wrangler dev --port 8788
```

### Frontend not connecting to backend
```bash
# Check .env.local
cat frontend/.env.local
# Should show: VITE_API_URL=http://localhost:8787

# Restart frontend
cd frontend
# Ctrl+C to stop
npm run dev
```

---

## Stop Testing

```bash
# In each terminal, press Ctrl+C to stop the dev servers
```

---

## Next: Deploy to Production

Once local testing works, follow **[DEPLOYMENT.md](./DEPLOYMENT.md)** to deploy to Cloudflare!
