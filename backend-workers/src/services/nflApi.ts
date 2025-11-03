export class NFLAPIService {
  private apiKey: string;
  private apiHost: string;
  private baseUrl = 'https://nfl-api-data.p.rapidapi.com';

  constructor(apiKey: string, apiHost: string) {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  private getHeaders(): HeadersInit {
    return {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': this.apiHost,
    };
  }

  async getPlayerInfo(playerName: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/nfl-player-search?name=${encodeURIComponent(playerName)}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching player info for ${playerName}:`, error);
      return null;
    }
  }

  async getPlayerStats(playerId: string, season: number = 2024): Promise<any> {
    try {
      const url = `${this.baseUrl}/nfl-player-stats/${playerId}?season=${season}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching player stats for ${playerId}:`, error);
      return null;
    }
  }

  async getPlayerTargetShare(playerId: string, season: number = 2024): Promise<number> {
    const stats = await this.getPlayerStats(playerId, season);
    if (!stats) return this.estimatePlayerShare(stats?.position || 'WR');

    try {
      const position = stats.position;

      if (position === 'WR' || position === 'TE') {
        const playerRecYards = stats.receiving_yards || 0;
        const teamRecYards = stats.team_receiving_yards || 1;
        return playerRecYards / teamRecYards;
      } else if (position === 'RB') {
        const playerRushYards = stats.rushing_yards || 0;
        const playerRecYards = stats.receiving_yards || 0;
        const teamRushYards = stats.team_rushing_yards || 1;
        return (playerRushYards + playerRecYards) / teamRushYards;
      } else if (position === 'QB') {
        const gamesStarted = stats.games_started || 0;
        const teamGames = stats.team_games || 17;
        return gamesStarted / teamGames;
      }

      return this.estimatePlayerShare(position);
    } catch (error) {
      console.error('Error calculating target share:', error);
      return this.estimatePlayerShare(stats?.position || 'WR');
    }
  }

  private estimatePlayerShare(position: string): number {
    const estimates: Record<string, number> = {
      QB: 0.95,
      RB: 0.35,
      WR: 0.25,
      TE: 0.15,
      K: 1.0,
      DEF: 1.0,
    };
    return estimates[position] || 0.2;
  }

  async getWeekSchedule(week: number, season: number = 2024): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/nfl-schedule?week=${week}&season=${season}`;
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error(`Error fetching week ${week} schedule:`, error);
      return [];
    }
  }
}

// NFL team abbreviations
export const NFL_TEAMS: Record<string, string> = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  LV: 'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  SF: 'San Francisco 49ers',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
};
