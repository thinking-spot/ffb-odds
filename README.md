# Fantasy Football Vegas Odds Platform

A platform that combines fantasy football with Vegas odds to provide matchup predictions, win probabilities, and team efficiency rankings.

## Features

- **Yahoo League Integration** - Import public league data
- **Vegas Odds Integration** - Real NFL odds from The Odds API
- **Hybrid Projections** - Combine player props + team totals to project fantasy points
- **Matchup Odds** - Vegas-style moneyline odds for fantasy matchups
- **Efficiency Rankings** - Expected wins vs actual wins (KenPom-style for fantasy)
- **Daily Updates** - Automated updates at 10am ET

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **Database**: Cloudflare D1 (SQLite)
- **APIs**:
  - [The Odds API](https://the-odds-api.com/) - Vegas odds
  - [NFL API Data](https://rapidapi.com/Creativesdev/api/nfl-api-data) - Player data

## Project Structure

```
ffb-odds/
├── frontend/          # React application
├── backend/           # FastAPI server
├── database/          # Database schemas
└── README.md
```

## Setup

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `.env` files in both backend and frontend directories:

**backend/.env**:
```
ODDS_API_KEY=your_odds_api_key
NFL_API_KEY=your_nfl_api_key
DATABASE_URL=your_cloudflare_d1_url
```

**frontend/.env**:
```
VITE_API_URL=http://localhost:8000
```

## API Keys

- Get The Odds API key: https://the-odds-api.com/
- Get NFL API key: https://rapidapi.com/Creativesdev/api/nfl-api-data

## Development

- Backend runs on http://localhost:8000
- Frontend runs on http://localhost:5173
- API docs available at http://localhost:8000/docs

## License

MIT
