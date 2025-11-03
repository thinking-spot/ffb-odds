import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addLeague, getCurrentUser, logout, getYahooAuthUrl } from '../services/api'
import './Home.css'

function Home() {
  const [leagueId, setLeagueId] = useState('')
  const [season, setSeason] = useState(2024)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const sessionId = localStorage.getItem('yahoo_session')
      if (sessionId) {
        try {
          const response = await getCurrentUser(sessionId)
          setUser(response.data)
        } catch (err) {
          // Session invalid, remove it
          localStorage.removeItem('yahoo_session')
        }
      }
      setCheckingAuth(false)
    }

    checkAuth()
  }, [])

  const handleConnectYahoo = () => {
    window.location.href = getYahooAuthUrl()
  }

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('yahoo_session')
    if (sessionId) {
      try {
        await logout(sessionId)
      } catch (err) {
        console.error('Logout error:', err)
      }
    }
    localStorage.removeItem('yahoo_session')
    setUser(null)
  }

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

      {!checkingAuth && !user && (
        <div className="card" style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
          <h3 style={{ marginTop: 0, color: '#856404' }}>🔐 Connect Your Yahoo Account</h3>
          <p style={{ color: '#856404', marginBottom: '1rem' }}>
            To access <strong>private leagues</strong>, connect your Yahoo Fantasy account.
            Public leagues can still be added without connecting.
          </p>
          <button
            onClick={handleConnectYahoo}
            className="submit-button"
            style={{ backgroundColor: '#5f01d1', borderColor: '#5f01d1' }}
          >
            Connect Yahoo Account
          </button>
        </div>
      )}

      {!checkingAuth && user && (
        <div className="card" style={{ backgroundColor: '#d4edda', borderColor: '#28a745' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginTop: 0, color: '#155724' }}>✓ Yahoo Account Connected</h3>
              <p style={{ color: '#155724', margin: 0 }}>
                You can now add both public and private leagues!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="submit-button"
              style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Get Started</h2>
        <p style={{ marginBottom: '1.5rem', color: '#888' }}>
          Enter your Yahoo league ID to see odds, projections, and efficiency rankings
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
          <li>Connect your Yahoo account (required for private leagues)</li>
          <li>Enter your Yahoo league ID (public or private)</li>
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
