import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLeagues } from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeagues()
  }, [])

  const fetchLeagues = async () => {
    try {
      const response = await getLeagues()
      setLeagues(response.data)
    } catch (err) {
      setError('Failed to load leagues')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading leagues...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/" className="add-league-link">
          <button>+ Add League</button>
        </Link>
      </div>

      {leagues.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            No leagues added yet. <Link to="/">Add your first league</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="leagues-grid">
          {leagues.map((league) => (
            <div key={league.league_id} className="league-card">
              <div className="league-header">
                <h3>{league.name}</h3>
                <span className="league-badge">{league.platform}</span>
              </div>

              <div className="league-info">
                <div className="info-row">
                  <span className="label">Season:</span>
                  <span className="value">{league.season}</span>
                </div>
                <div className="info-row">
                  <span className="label">Week:</span>
                  <span className="value">{league.current_week}</span>
                </div>
                <div className="info-row">
                  <span className="label">Teams:</span>
                  <span className="value">{league.num_teams}</span>
                </div>
                <div className="info-row">
                  <span className="label">Scoring:</span>
                  <span className="value">{league.scoring_type.toUpperCase()}</span>
                </div>
              </div>

              <div className="league-actions">
                <Link to={`/matchups?league=${league.league_id}&week=${league.current_week}`}>
                  <button className="primary-button">View Matchups</button>
                </Link>
                <Link to={`/rankings?league=${league.league_id}&week=${league.current_week}`}>
                  <button className="secondary-button">View Rankings</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
