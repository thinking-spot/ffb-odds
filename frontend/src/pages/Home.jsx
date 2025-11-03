import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addLeague } from '../services/api'
import './Home.css'

function Home() {
  const [leagueId, setLeagueId] = useState('')
  const [season, setSeason] = useState(2024)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await addLeague(leagueId, season)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add league. Please check your League ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <div className="hero">
        <h1>🏈 Fantasy Football Vegas Odds</h1>
        <p className="subtitle">
          Get Vegas-style odds for your fantasy matchups, powered by real NFL betting data
        </p>
      </div>

      <div className="card">
        <h2>Get Started</h2>
        <p style={{ marginBottom: '1.5rem', color: '#888' }}>
          Enter your Yahoo public league ID to see odds, projections, and efficiency rankings
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="league-form">
          <div className="form-group">
            <label htmlFor="leagueId">Yahoo League ID</label>
            <input
              id="leagueId"
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="e.g., 123456"
              required
              disabled={loading}
            />
            <small>
              Find your league ID in your Yahoo league URL: fantasysports.yahooapis.com/.../<strong>123456</strong>
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="season">Season</label>
            <input
              id="season"
              type="number"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value))}
              min="2020"
              max="2030"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Loading...' : 'Add League'}
          </button>
        </form>
      </div>

      <div className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>📊 Vegas-Style Odds</h3>
            <p>See moneyline odds and win probabilities for every matchup, just like Vegas</p>
          </div>
          <div className="feature-card">
            <h3>🎯 Hybrid Projections</h3>
            <p>Combine player props + NFL team totals for accurate fantasy point projections</p>
          </div>
          <div className="feature-card">
            <h3>📈 Efficiency Rankings</h3>
            <p>KenPom-style ratings showing expected wins vs actual wins (luck factor)</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Daily Updates</h3>
            <p>Automated updates every day at 10am ET with fresh odds and projections</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>How It Works</h3>
        <ol className="how-it-works">
          <li>Enter your Yahoo public league ID</li>
          <li>We fetch your league's rosters and matchups</li>
          <li>Vegas odds are pulled for all NFL games</li>
          <li>Player props + team totals are converted to fantasy projections</li>
          <li>Matchup odds are calculated based on projected points</li>
          <li>Efficiency metrics show which teams are over/under-performing</li>
        </ol>
      </div>
    </div>
  )
}

export default Home
