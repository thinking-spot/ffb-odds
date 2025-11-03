import { League, Team, Player, Matchup } from '../models/schemas';

export class YahooFantasyService {
  private baseUrl = 'https://fantasysports.yahooapis.com/fantasy/v2';
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  async getLeague(leagueId: string, season: number = 2024): Promise<League | null> {
    try {
      if (!this.accessToken) {
        throw new Error('OAuth token required to access Yahoo Fantasy leagues');
      }

      const leagueData = await this.fetchLeagueMetadata(leagueId, season);
      const teamsData = await this.fetchTeams(leagueId, season);

      const league: League = {
        league_id: leagueId,
        name: leagueData.name,
        platform: 'yahoo',
        season,
        current_week: leagueData.current_week,
        num_teams: leagueData.num_teams,
        scoring_type: leagueData.scoring_type,
        teams: teamsData,
      };

      return league;
    } catch (error) {
      console.error(`Error fetching Yahoo league ${leagueId}:`, error);
      return null;
    }
  }

  private async fetchLeagueMetadata(leagueId: string, season: number): Promise<any> {
    const leagueKey = formatYahooLeagueKey(leagueId, season);
    const url = `${this.baseUrl}/league/${leagueKey}/metadata?format=json`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const league = data.fantasy_content.league[0];

    return {
      name: league.name,
      current_week: parseInt(league.current_week),
      num_teams: parseInt(league.num_teams),
      scoring_type: league.scoring_type || 'standard',
    };
  }

  private async fetchTeams(leagueId: string, season: number): Promise<Team[]> {
    const leagueKey = formatYahooLeagueKey(leagueId, season);
    const url = `${this.baseUrl}/league/${leagueKey}/teams?format=json`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const teamsData = data.fantasy_content.league[1].teams;

    const teams: Team[] = [];
    for (const [key, value] of Object.entries(teamsData)) {
      if (key === 'count') continue;

      const teamData = (value as any).team[0];
      teams.push({
        team_id: teamData.team_key,
        league_id: leagueId,
        name: teamData.name,
        manager_name: teamData.managers?.[0]?.manager?.nickname || 'Unknown',
        wins: parseInt(teamData.team_standings?.outcome_totals?.wins || '0'),
        losses: parseInt(teamData.team_standings?.outcome_totals?.losses || '0'),
        ties: parseInt(teamData.team_standings?.outcome_totals?.ties || '0'),
        points_for: parseFloat(teamData.team_points?.total || '0'),
        points_against: 0, // Calculate from matchups
        roster: [],
      });
    }

    return teams;
  }

  async getTeamRoster(teamId: string, week: number, season: number): Promise<Player[]> {
    // Placeholder - would make actual Yahoo API call
    return [];
  }

  async getMatchups(leagueId: string, week: number, season: number): Promise<Matchup[]> {
    // Placeholder - would make actual Yahoo API call
    return [];
  }
}

// Utility functions
export function parseYahooLeagueId(leagueKey: string): { leagueId: string; season: number } {
  const parts = leagueKey.split('.');
  if (parts.length >= 3 && parts[1] === 'l') {
    const gameKey = parseInt(parts[0]);
    const leagueId = parts[2];
    const season = 2024 - (423 - gameKey);
    return { leagueId, season };
  }
  return { leagueId: leagueKey, season: 2024 };
}

export function formatYahooLeagueKey(leagueId: string, season: number): string {
  const gameKey = 423 + (season - 2024);
  return `${gameKey}.l.${leagueId}`;
}
