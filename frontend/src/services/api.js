import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Leagues
export const addLeague = (leagueId, season = 2024) => {
  const sessionId = localStorage.getItem('yahoo_session')
  const sessionParam = sessionId ? `&session=${sessionId}` : ''
  return api.post(`/leagues/?league_id=${leagueId}&season=${season}${sessionParam}`)
}

export const getLeagues = (season = null) => {
  const params = season ? { season } : {}
  return api.get('/leagues/', { params })
}

export const getLeague = (leagueId) => {
  return api.get(`/leagues/${leagueId}`)
}

export const getLeagueTeams = (leagueId) => {
  return api.get(`/leagues/${leagueId}/teams`)
}

export const deleteLeague = (leagueId) => {
  return api.delete(`/leagues/${leagueId}`)
}

// Matchups
export const getLeagueMatchups = (leagueId, week, season = 2024) => {
  return api.get(`/matchups/league/${leagueId}`, {
    params: { week, season }
  })
}

export const getMatchup = (matchupId) => {
  return api.get(`/matchups/${matchupId}`)
}

// Odds
export const getMatchupOdds = (matchupId) => {
  return api.get(`/odds/matchup/${matchupId}`)
}

export const getLeagueWeekOdds = (leagueId, week, season = 2024) => {
  return api.get(`/odds/league/${leagueId}/week/${week}`, {
    params: { season }
  })
}

export const getNFLWeekOdds = (week, season = 2024) => {
  return api.get(`/odds/nfl/week/${week}`, {
    params: { season }
  })
}

// Efficiency
export const getLeagueEfficiency = (leagueId, week, season = 2024) => {
  return api.get(`/efficiency/league/${leagueId}`, {
    params: { week, season }
  })
}

export const getTeamEfficiency = (teamId, week, season = 2024) => {
  return api.get(`/efficiency/team/${teamId}`, {
    params: { week, season }
  })
}

// Health check
export const healthCheck = () => {
  return api.get('/health')
}

// OAuth / Authentication
export const getYahooAuthUrl = () => {
  return `${API_URL}/auth/yahoo`
}

export const getCurrentUser = (sessionId) => {
  return axios.get(`${API_URL}/auth/me`, {
    params: { session: sessionId }
  })
}

export const logout = (sessionId) => {
  return axios.post(`${API_URL}/auth/logout`, null, {
    params: { session: sessionId }
  })
}

export default api
