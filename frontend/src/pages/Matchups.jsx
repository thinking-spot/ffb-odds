import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getLeagueWeekOdds } from '../services/api'
import './Matchups.css'

function Matchups() {
  const [searchParams] = useSearchParams()
  const leagueId = searchParams.get('league')
  const week = parseInt(searchParams.get('week') || '10')

  const [matchups, setMatchups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (leagueId) {
      fetchMatchups()
    }
  }, [leagueId, week])

  const fetchMatchups = async () => {
    try {
      const response = await getLeagueWeekOdds(leagueId, week)
      setMatchups(response.data)
    } catch (err) {
      setError('Failed to load matchup odds')
    } finally {
      setLoading(false)
    }
  }

  const formatMoneyline = (moneyline) => {
    if (moneyline > 0) return `+${moneyline}`
    return moneyline.toString()
  }

  const formatProbability = (probability) => {
    return `${(probability * 100).toFixed(1)}%`
  }

  const formatSpread = (spread) => {
    if (spread > 0) return `+${spread.toFixed(1)}`
    return spread.toFixed(1)
  }

  if (!leagueId) {
    return (
      <div className="matchups">
        <h1>Matchups</h1>
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            Please select a league from the dashboard
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="loading">Loading matchups...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="matchups">
      <div className="matchups-header">
        <h1>Week {week} Matchups</h1>
        <div className="week-selector">
          <button onClick={() => { if (week > 1) window.location.href = `?league=${leagueId}&week=${week - 1}` }}>
            ← Prev Week
          </button>
          <button onClick={() => { if (week < 17) window.location.href = `?league=${leagueId}&week=${week + 1}` }}>
            Next Week →
          </button>
        </div>
      </div>

      {matchups.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            No matchup data available for week {week}
          </p>
        </div>
      ) : (
        <div className="matchups-grid">
          {matchups.map((matchup) => (
            <div key={matchup.matchup_id} className="matchup-card">
              <div className="matchup-header">
                <span className={`confidence-badge ${matchup.confidence_level}`}>
                  {matchup.confidence_level} confidence
                </span>
              </div>

              <div className="matchup-teams">
                <div className={`team ${matchup.team1_win_probability > 0.5 ? 'favorite' : 'underdog'}`}>
                  <div className="team-name">{matchup.team1_name}</div>
                  <div className="team-projection">{matchup.team1_projected_points.toFixed(1)} pts</div>
                  <div className="team-odds">
                    <span className="moneyline">{formatMoneyline(matchup.team1_moneyline)}</span>
                    <span className="probability">{formatProbability(matchup.team1_win_probability)}</span>
                  </div>
                </div>

                <div className="matchup-vs">
                  <div className="vs-text">VS</div>
                  <div className="spread-text">
                    Spread: {formatSpread(matchup.projected_spread)}
                  </div>
                </div>

                <div className={`team ${matchup.team2_win_probability > 0.5 ? 'favorite' : 'underdog'}`}>
                  <div className="team-name">{matchup.team2_name}</div>
                  <div className="team-projection">{matchup.team2_projected_points.toFixed(1)} pts</div>
                  <div className="team-odds">
                    <span className="moneyline">{formatMoneyline(matchup.team2_moneyline)}</span>
                    <span className="probability">{formatProbability(matchup.team2_win_probability)}</span>
                  </div>
                </div>
              </div>

              <div className="matchup-footer">
                <small>Updated: {new Date(matchup.updated_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Matchups
