import { League, Team, Matchup, TeamOdds, MatchupOdds, TeamEfficiency } from '../models/schemas';

export class DatabaseQueries {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // ===== Leagues =====
  async insertLeague(league: League): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO leagues
         (league_id, name, platform, season, current_week, num_teams, scoring_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        league.league_id,
        league.name,
        league.platform,
        league.season,
        league.current_week,
        league.num_teams,
        league.scoring_type
      )
      .run();
  }

  async getLeague(leagueId: string): Promise<any> {
    const result = await this.db.prepare('SELECT * FROM leagues WHERE league_id = ?').bind(leagueId).first();
    return result;
  }

  async getAllLeagues(season?: number): Promise<any[]> {
    let query = 'SELECT * FROM leagues';
    const bindings: any[] = [];

    if (season) {
      query += ' WHERE season = ?';
      bindings.push(season);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.prepare(query).bind(...bindings).all();
    return result.results || [];
  }

  async deleteLeague(leagueId: string): Promise<void> {
    await this.db.prepare('DELETE FROM leagues WHERE league_id = ?').bind(leagueId).run();
  }

  // ===== Teams =====
  async insertTeam(team: Team): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO teams
         (team_id, league_id, name, manager_name, wins, losses, ties, points_for, points_against)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        team.team_id,
        team.league_id,
        team.name,
        team.manager_name,
        team.wins,
        team.losses,
        team.ties,
        team.points_for,
        team.points_against
      )
      .run();
  }

  async getTeamsByLeague(leagueId: string): Promise<any[]> {
    const result = await this.db
      .prepare('SELECT * FROM teams WHERE league_id = ? ORDER BY wins DESC, points_for DESC')
      .bind(leagueId)
      .all();
    return result.results || [];
  }

  async getTeam(teamId: string): Promise<any> {
    const result = await this.db.prepare('SELECT * FROM teams WHERE team_id = ?').bind(teamId).first();
    return result;
  }

  // ===== Matchups =====
  async insertMatchup(matchup: Matchup): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO matchups
         (matchup_id, league_id, week, season, team1_id, team2_id, team1_score, team2_score, is_completed, game_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        matchup.matchup_id,
        matchup.league_id,
        matchup.week,
        matchup.season,
        matchup.team1_id,
        matchup.team2_id,
        matchup.team1_score,
        matchup.team2_score,
        matchup.is_completed ? 1 : 0,
        matchup.game_date
      )
      .run();
  }

  async getMatchupsByLeagueWeek(leagueId: string, week: number, season: number): Promise<any[]> {
    const result = await this.db
      .prepare('SELECT * FROM matchups WHERE league_id = ? AND week = ? AND season = ? ORDER BY matchup_id')
      .bind(leagueId, week, season)
      .all();
    return result.results || [];
  }

  async getMatchup(matchupId: string): Promise<any> {
    const result = await this.db.prepare('SELECT * FROM matchups WHERE matchup_id = ?').bind(matchupId).first();
    return result;
  }

  // ===== Team Odds =====
  async insertTeamOdds(odds: TeamOdds): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO team_odds
         (nfl_team, opponent, week, season, team_total_ou, spread, moneyline, win_probability, game_time, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        odds.nfl_team,
        odds.opponent,
        odds.week,
        odds.season,
        odds.team_total_over_under,
        odds.spread,
        odds.moneyline,
        odds.win_probability,
        odds.game_time,
        odds.updated_at
      )
      .run();
  }

  async getTeamOddsByWeek(week: number, season: number): Promise<any[]> {
    const result = await this.db
      .prepare('SELECT * FROM team_odds WHERE week = ? AND season = ? ORDER BY nfl_team')
      .bind(week, season)
      .all();
    return result.results || [];
  }

  // ===== Matchup Odds =====
  async insertMatchupOdds(odds: MatchupOdds): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO matchup_odds
         (matchup_id, league_id, week, season, team1_id, team1_projected_points, team1_moneyline, team1_win_probability,
          team2_id, team2_projected_points, team2_moneyline, team2_win_probability, projected_spread, confidence_level, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        odds.matchup_id,
        odds.league_id,
        odds.week,
        odds.season,
        odds.team1_id,
        odds.team1_projected_points,
        odds.team1_moneyline,
        odds.team1_win_probability,
        odds.team2_id,
        odds.team2_projected_points,
        odds.team2_moneyline,
        odds.team2_win_probability,
        odds.projected_spread,
        odds.confidence_level,
        odds.updated_at
      )
      .run();
  }

  async getMatchupOdds(matchupId: string): Promise<any> {
    const result = await this.db
      .prepare(
        `SELECT mo.*, t1.name as team1_name, t2.name as team2_name
         FROM matchup_odds mo
         LEFT JOIN teams t1 ON mo.team1_id = t1.team_id
         LEFT JOIN teams t2 ON mo.team2_id = t2.team_id
         WHERE mo.matchup_id = ?`
      )
      .bind(matchupId)
      .first();
    return result;
  }

  async getMatchupOddsByLeagueWeek(leagueId: string, week: number, season: number): Promise<any[]> {
    const result = await this.db
      .prepare(
        `SELECT mo.*, t1.name as team1_name, t2.name as team2_name
         FROM matchup_odds mo
         LEFT JOIN teams t1 ON mo.team1_id = t1.team_id
         LEFT JOIN teams t2 ON mo.team2_id = t2.team_id
         WHERE mo.league_id = ? AND mo.week = ? AND mo.season = ?
         ORDER BY mo.matchup_id`
      )
      .bind(leagueId, week, season)
      .all();
    return result.results || [];
  }

  // ===== Team Efficiency =====
  async insertTeamEfficiency(efficiency: TeamEfficiency): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO team_efficiency
         (team_id, league_id, season, week, wins, losses, ties, win_percentage,
          points_for, points_against, points_differential, avg_points_for, avg_points_against,
          expected_wins, expected_losses, expected_win_percentage, luck_factor, efficiency_rating,
          strength_of_schedule, power_rank, record_rank, points_for_rank, points_against_rank,
          playoff_probability, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        efficiency.team_id,
        efficiency.league_id,
        efficiency.season,
        efficiency.week,
        efficiency.wins,
        efficiency.losses,
        efficiency.ties,
        efficiency.win_percentage,
        efficiency.points_for,
        efficiency.points_against,
        efficiency.points_differential,
        efficiency.avg_points_for,
        efficiency.avg_points_against,
        efficiency.expected_wins,
        efficiency.expected_losses,
        efficiency.expected_win_percentage,
        efficiency.luck_factor,
        efficiency.efficiency_rating,
        efficiency.strength_of_schedule,
        efficiency.power_rank,
        efficiency.record_rank,
        efficiency.points_for_rank,
        efficiency.points_against_rank,
        efficiency.playoff_probability,
        efficiency.updated_at
      )
      .run();
  }

  async getTeamEfficiencyByLeague(leagueId: string, week: number, season: number): Promise<any[]> {
    const result = await this.db
      .prepare(
        'SELECT * FROM team_efficiency WHERE league_id = ? AND week = ? AND season = ? ORDER BY power_rank'
      )
      .bind(leagueId, week, season)
      .all();
    return result.results || [];
  }

  async getTeamEfficiency(teamId: string, week: number, season: number): Promise<any> {
    const result = await this.db
      .prepare('SELECT * FROM team_efficiency WHERE team_id = ? AND week = ? AND season = ?')
      .bind(teamId, week, season)
      .first();
    return result;
  }

  // ===== OAuth Tokens =====
  async upsertOAuthToken(token: {
    user_id: string;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_at: number;
    yahoo_guid?: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO oauth_tokens
         (user_id, access_token, refresh_token, token_type, expires_at, yahoo_guid)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        token.user_id,
        token.access_token,
        token.refresh_token,
        token.token_type,
        token.expires_at,
        token.yahoo_guid || null
      )
      .run();
  }

  async getOAuthToken(userId: string): Promise<any> {
    const result = await this.db
      .prepare('SELECT * FROM oauth_tokens WHERE user_id = ?')
      .bind(userId)
      .first();
    return result;
  }

  async updateOAuthToken(userId: string, accessToken: string, expiresAt: number): Promise<void> {
    await this.db
      .prepare('UPDATE oauth_tokens SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .bind(accessToken, expiresAt, userId)
      .run();
  }

  async deleteOAuthToken(userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM oauth_tokens WHERE user_id = ?').bind(userId).run();
  }
}
