import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getLeagueEfficiency, getLeagueTeams } from '../services/api'
import './Rankings.css'

function Rankings() {
  const [searchParams] = useSearchParams()
  const leagueId = searchParams.get('league')
  const week = parseInt(searchParams.get('week') || '10')

  const [rankings, setRankings] = useState([])
  const [teams, setTeams] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('power_rank')

  useEffect(() => {
    if (leagueId) {
      fetchData()
    }
  }, [leagueId, week])

  const fetchData = async () => {
    try {
      const [efficiencyResponse, teamsResponse] = await Promise.all([
        getLeagueEfficiency(leagueId, week),
        getLeagueTeams(leagueId)
      ])

      setRankings(efficiencyResponse.data)

      const teamsMap = {}
      teamsResponse.data.forEach(team => {
        teamsMap[team.team_id] = team
      })
      setTeams(teamsMap)
    } catch (err) {
      setError('Failed to load rankings')
    } finally {
      setLoading(false)
    }
  }

  const getSortedRankings = () => {
    const sorted = [...rankings].sort((a, b) => {
      if (sortBy === 'power_rank' || sortBy === 'record_rank') {
        return a[sortBy] - b[sortBy]
      } else if (sortBy === 'efficiency_rating' || sortBy === 'expected_wins' || sortBy === 'luck_factor') {
        return b[sortBy] - a[sortBy]
      }
      return 0
    })
    return sorted
  }

  if (!leagueId) {
    return (
      <div className="rankings">
        <h1>Rankings</h1>
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            Please select a league from the <Link to="/dashboard">dashboard</Link>
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="loading">Loading rankings...</div>
  if (error) return <div className="error">{error}</div>

  const sortedRankings = getSortedRankings()

  return (
    <div className="rankings">
      <div className="rankings-header">
        <h1>Week {week} Efficiency Rankings</h1>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="power_rank">Power Rank</option>
            <option value="record_rank">Record Rank</option>
            <option value="efficiency_rating">Efficiency Rating</option>
            <option value="expected_wins">Expected Wins</option>
            <option value="luck_factor">Luck Factor</option>
          </select>
        </div>
      </div>

      {rankings.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            No ranking data available for week {week}
          </p>
        </div>
      ) : (
        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Power Rank</th>
                <th>Team</th>
                <th>Record</th>
                <th>Points For</th>
                <th>Points Against</th>
                <th>Expected W-L</th>
                <th>Luck</th>
                <th>Efficiency</th>
                <th>Playoff %</th>
              </tr>
            </thead>
            <tbody>
              {sortedRankings.map((ranking) => {
                const team = teams[ranking.team_id]
                const luckClass = ranking.luck_factor > 0 ? 'lucky' : ranking.luck_factor < 0 ? 'unlucky' : 'neutral'

                return (
                  <tr key={ranking.team_id}>
                    <td className="rank-cell">#{ranking.power_rank}</td>
                    <td className="team-cell">
                      <div className="team-name">{team?.name || 'Unknown'}</div>
                      <div className="team-manager">{team?.manager_name}</div>
                    </td>
                    <td>{ranking.wins}-{ranking.losses}{ranking.ties > 0 ? `-${ranking.ties}` : ''}</td>
                    <td>{ranking.points_for.toFixed(1)}</td>
                    <td>{ranking.points_against.toFixed(1)}</td>
                    <td>
                      {ranking.expected_wins.toFixed(1)}-{ranking.expected_losses.toFixed(1)}
                    </td>
                    <td className={luckClass}>
                      {ranking.luck_factor > 0 ? '+' : ''}{ranking.luck_factor.toFixed(1)}
                    </td>
                    <td className="efficiency-cell">
                      {ranking.efficiency_rating.toFixed(1)}
                    </td>
                    <td className="playoff-cell">
                      <div className="playoff-bar-container">
                        <div
                          className="playoff-bar"
                          style={{ width: `${ranking.playoff_probability * 100}%` }}
                        />
                        <span className="playoff-text">
                          {(ranking.playoff_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card legend">
        <h3>Legend</h3>
        <ul>
          <li><strong>Power Rank:</strong> Team ranking based on efficiency rating (strength of team)</li>
          <li><strong>Expected W-L:</strong> What team's record "should be" based on points (Pythagorean expectation)</li>
          <li><strong>Luck Factor:</strong> Actual wins minus expected wins (positive = lucky, negative = unlucky)</li>
          <li><strong>Efficiency:</strong> Overall team rating (100 = league average, higher is better)</li>
          <li><strong>Playoff %:</strong> Estimated probability of making playoffs based on current trajectory</li>
        </ul>
      </div>
    </div>
  )
}

export default Rankings
