import { Team, TeamEfficiency } from '../models/schemas';

export class EfficiencyCalculator {
  private pythagoreanExponent: number;

  constructor(pythagoreanExponent: number = 2.37) {
    this.pythagoreanExponent = pythagoreanExponent;
  }

  calculateExpectedWins(pointsFor: number, pointsAgainst: number, gamesPlayed: number): number {
    if (pointsFor <= 0 || pointsAgainst <= 0) return 0;

    const pfExp = Math.pow(pointsFor, this.pythagoreanExponent);
    const paExp = Math.pow(pointsAgainst, this.pythagoreanExponent);

    const expectedWinPct = pfExp / (pfExp + paExp);
    return expectedWinPct * gamesPlayed;
  }

  calculateEfficiencyRating(avgPointsFor: number, avgPointsAgainst: number, leagueAvgPpg: number = 100): number {
    if (leagueAvgPpg <= 0 || avgPointsAgainst <= 0) return 100;

    const offensiveRating = avgPointsFor / leagueAvgPpg;
    const defensiveRating = avgPointsAgainst / leagueAvgPpg;

    return (offensiveRating / defensiveRating) * 100;
  }

  calculateLuckFactor(actualWins: number, expectedWins: number): number {
    return actualWins - expectedWins;
  }

  calculateStrengthOfSchedule(opponentRatings: number[]): number {
    if (opponentRatings.length === 0) return 100;
    return opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length;
  }

  calculatePlayoffProbability(
    teamEfficiency: TeamEfficiency,
    allTeamEfficiencies: TeamEfficiency[],
    weeksRemaining: number,
    playoffSpots: number = 6
  ): number {
    if (weeksRemaining <= 0) {
      const currentRank = this.getRankByRecord(teamEfficiency, allTeamEfficiencies);
      return currentRank <= playoffSpots ? 1.0 : 0.0;
    }

    const currentWins = teamEfficiency.wins + teamEfficiency.ties * 0.5;
    const remainingExpectedWins = teamEfficiency.expected_win_percentage * weeksRemaining;
    const projectedWins = currentWins + remainingExpectedWins;

    const allProjectedWins = allTeamEfficiencies.map((other) => {
      const otherCurrent = other.wins + other.ties * 0.5;
      const otherRemaining = other.expected_win_percentage * weeksRemaining;
      return otherCurrent + otherRemaining;
    });

    allProjectedWins.sort((a, b) => b - a);

    if (projectedWins >= allProjectedWins[playoffSpots - 1]) {
      const gap = projectedWins - allProjectedWins[playoffSpots - 1];
      return Math.min(0.95, 0.7 + gap * 0.1);
    } else {
      const gap = allProjectedWins[playoffSpots - 1] - projectedWins;
      return Math.max(0.05, 0.3 - gap * 0.1);
    }
  }

  private getRankByRecord(team: TeamEfficiency, allTeams: TeamEfficiency[]): number {
    const sorted = [...allTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.points_for - a.points_for;
    });

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].team_id === team.team_id) return i + 1;
    }
    return allTeams.length;
  }

  async calculateTeamEfficiency(
    team: Team,
    week: number,
    season: number,
    leagueAvgPpg: number,
    allTeams: Team[],
    weeksRemaining: number
  ): Promise<TeamEfficiency> {
    let gamesPlayed = team.wins + team.losses + team.ties;
    if (gamesPlayed === 0) gamesPlayed = 1;

    const avgPf = team.points_for / gamesPlayed;
    const avgPa = team.points_against / gamesPlayed;
    const winPct = team.wins / gamesPlayed;

    const expectedWins = this.calculateExpectedWins(team.points_for, team.points_against, gamesPlayed);
    const expectedLosses = gamesPlayed - expectedWins;
    const expectedWinPct = expectedWins / gamesPlayed;

    const luck = this.calculateLuckFactor(team.wins, expectedWins);
    const efficiencyRating = this.calculateEfficiencyRating(avgPf, avgPa, leagueAvgPpg);

    const efficiency: TeamEfficiency = {
      team_id: team.team_id,
      league_id: team.league_id,
      season,
      week,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      win_percentage: winPct,
      points_for: team.points_for,
      points_against: team.points_against,
      points_differential: team.points_for - team.points_against,
      avg_points_for: avgPf,
      avg_points_against: avgPa,
      expected_wins: expectedWins,
      expected_losses: expectedLosses,
      expected_win_percentage: expectedWinPct,
      luck_factor: luck,
      efficiency_rating: efficiencyRating,
      strength_of_schedule: 100,
      power_rank: 0,
      record_rank: 0,
      points_for_rank: 0,
      points_against_rank: 0,
      playoff_probability: 0,
      updated_at: new Date().toISOString(),
    };

    return efficiency;
  }

  calculateLeagueRankings(
    efficiencies: TeamEfficiency[],
    weeksRemaining: number,
    playoffSpots: number = 6
  ): TeamEfficiency[] {
    // Power rankings
    const sortedByRating = [...efficiencies].sort((a, b) => b.efficiency_rating - a.efficiency_rating);
    sortedByRating.forEach((eff, i) => {
      eff.power_rank = i + 1;
    });

    // Record rankings
    const sortedByRecord = [...efficiencies].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.points_for - a.points_for;
    });
    sortedByRecord.forEach((eff, i) => {
      eff.record_rank = i + 1;
    });

    // Points for rankings
    const sortedByPf = [...efficiencies].sort((a, b) => b.points_for - a.points_for);
    sortedByPf.forEach((eff, i) => {
      eff.points_for_rank = i + 1;
    });

    // Points against rankings
    const sortedByPa = [...efficiencies].sort((a, b) => a.points_against - b.points_against);
    sortedByPa.forEach((eff, i) => {
      eff.points_against_rank = i + 1;
    });

    // Playoff probabilities
    efficiencies.forEach((eff) => {
      eff.playoff_probability = this.calculatePlayoffProbability(eff, efficiencies, weeksRemaining, playoffSpots);
    });

    return efficiencies;
  }
}
