import { TeamOdds, PlayerOdds } from '../models/schemas';

export class OddsAPIService {
  private apiKey: string;
  private baseUrl = 'https://api.the-odds-api.com/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getNFLOdds(markets: string[] = ['h2h', 'spreads', 'totals']): Promise<any[]> {
    const url = `${this.baseUrl}/sports/americanfootball_nfl/odds`;
    const params = new URLSearchParams({
      apiKey: this.apiKey,
      regions: 'us',
      markets: markets.join(','),
      oddsFormat: 'american',
      dateFormat: 'iso',
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`Odds API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching NFL odds:', error);
      return [];
    }
  }

  async getTeamOddsByWeek(week: number, season: number = 2024): Promise<TeamOdds[]> {
    const oddsData = await this.getNFLOdds();
    const teamOddsList: TeamOdds[] = [];

    for (const game of oddsData) {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const commenceTime = game.commence_time;

      const bookmakers = game.bookmakers || [];
      if (bookmakers.length === 0) continue;

      const bookmaker = bookmakers[0];
      const markets = bookmaker.markets || [];

      const totals = this.findMarket(markets, 'totals');
      const spreads = this.findMarket(markets, 'spreads');
      const h2h = this.findMarket(markets, 'h2h');

      // Home team odds
      const homeOdds: TeamOdds = {
        nfl_team: homeTeam,
        opponent: awayTeam,
        week,
        season,
        team_total_over_under: this.getTeamTotal(totals),
        spread: this.getSpread(spreads, homeTeam),
        moneyline: this.getMoneyline(h2h, homeTeam),
        win_probability: this.moneylineToWinProbability(this.getMoneyline(h2h, homeTeam)),
        game_time: commenceTime,
        updated_at: new Date().toISOString(),
      };
      teamOddsList.push(homeOdds);

      // Away team odds
      const awayOdds: TeamOdds = {
        nfl_team: awayTeam,
        opponent: homeTeam,
        week,
        season,
        team_total_over_under: this.getTeamTotal(totals),
        spread: this.getSpread(spreads, awayTeam),
        moneyline: this.getMoneyline(h2h, awayTeam),
        win_probability: this.moneylineToWinProbability(this.getMoneyline(h2h, awayTeam)),
        game_time: commenceTime,
        updated_at: new Date().toISOString(),
      };
      teamOddsList.push(awayOdds);
    }

    return teamOddsList;
  }

  private findMarket(markets: any[], marketKey: string): any | null {
    return markets.find((m) => m.key === marketKey) || null;
  }

  private getTeamTotal(totalsMarket: any): number | undefined {
    if (!totalsMarket) return undefined;
    const outcomes = totalsMarket.outcomes || [];
    const overOutcome = outcomes.find((o: any) => o.name === 'Over');
    if (overOutcome && overOutcome.point) {
      return overOutcome.point / 2; // Team total is ~half of game total
    }
    return undefined;
  }

  private getSpread(spreadsMarket: any, team: string): number | undefined {
    if (!spreadsMarket) return undefined;
    const outcomes = spreadsMarket.outcomes || [];
    const teamOutcome = outcomes.find((o: any) => o.name === team);
    return teamOutcome?.point;
  }

  private getMoneyline(h2hMarket: any, team: string): number | undefined {
    if (!h2hMarket) return undefined;
    const outcomes = h2hMarket.outcomes || [];
    const teamOutcome = outcomes.find((o: any) => o.name === team);
    return teamOutcome?.price ? parseInt(teamOutcome.price) : undefined;
  }

  private moneylineToWinProbability(moneyline: number | undefined): number | undefined {
    if (moneyline === undefined) return undefined;

    if (moneyline > 0) {
      return 100 / (moneyline + 100);
    } else if (moneyline < 0) {
      return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
    }
    return 0.5;
  }
}
