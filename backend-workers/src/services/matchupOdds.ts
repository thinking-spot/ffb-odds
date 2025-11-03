import { Matchup, MatchupOdds, TeamProjection } from '../models/schemas';

export class MatchupOddsGenerator {
  generateMatchupOdds(
    matchup: Matchup,
    team1Projection: TeamProjection,
    team2Projection: TeamProjection,
    team1Name: string,
    team2Name: string
  ): MatchupOdds {
    const proj1 = team1Projection.total_projected_points;
    const proj2 = team2Projection.total_projected_points;

    const spread = proj1 - proj2;

    // Convert spread to win probability using logistic function
    const k = 15; // Scaling factor
    const prob1 = 1 / (1 + Math.exp(-spread / k));
    const prob2 = 1 - prob1;

    const ml1 = this.probabilityToMoneyline(prob1);
    const ml2 = this.probabilityToMoneyline(prob2);

    const confidence = this.determineMatchupConfidence(team1Projection, team2Projection);

    const matchupOdds: MatchupOdds = {
      matchup_id: matchup.matchup_id,
      league_id: matchup.league_id,
      week: matchup.week,
      season: matchup.season,
      team1_id: matchup.team1_id,
      team1_name,
      team1_projected_points: proj1,
      team1_moneyline: ml1,
      team1_win_probability: prob1,
      team2_id: matchup.team2_id,
      team2_name,
      team2_projected_points: proj2,
      team2_moneyline: ml2,
      team2_win_probability: prob2,
      projected_spread: spread,
      confidence_level: confidence,
      updated_at: new Date().toISOString(),
    };

    return matchupOdds;
  }

  private probabilityToMoneyline(probability: number): number {
    if (probability >= 0.99) return -10000;
    if (probability <= 0.01) return 10000;

    if (probability > 0.5) {
      const ml = -100 * (probability / (1 - probability));
      return Math.round(ml);
    } else if (probability < 0.5) {
      const ml = 100 * ((1 - probability) / probability);
      return Math.round(ml);
    } else {
      return 100;
    }
  }

  private determineMatchupConfidence(team1Proj: TeamProjection, team2Proj: TeamProjection): string {
    const confidences = [team1Proj.confidence, team2Proj.confidence];
    if (confidences.every((c) => c === 'high')) return 'high';
    if (confidences.some((c) => c === 'low')) return 'low';
    return 'medium';
  }

  getImpliedProbability(moneyline: number): number {
    if (moneyline < 0) {
      return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
    } else {
      return 100 / (moneyline + 100);
    }
  }

  calculateExpectedValue(betAmount: number, moneyline: number, trueProbability: number): number {
    const impliedProb = this.getImpliedProbability(moneyline);
    let profit: number;

    if (moneyline < 0) {
      profit = betAmount * (100 / Math.abs(moneyline));
    } else {
      profit = betAmount * (moneyline / 100);
    }

    const ev = trueProbability * profit - (1 - trueProbability) * betAmount;
    return ev;
  }
}
