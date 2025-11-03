import { Env } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';
import { OddsAPIService } from '../services/oddsApi';
import { NFLAPIService } from '../services/nflApi';
import { ProjectionEngine } from '../services/projections';
import { EfficiencyCalculator } from '../services/efficiency';
import { MatchupOddsGenerator } from '../services/matchupOdds';
import { CacheService } from '../services/cache';

export async function dailyUpdate(env: Env): Promise<void> {
  console.log(`⏰ Starting daily update at ${new Date().toISOString()}`);

  try {
    const db = new DatabaseQueries(env.DB);
    const cache = new CacheService(env.CACHE);
    const oddsService = new OddsAPIService(env.ODDS_API_KEY);
    const nflService = new NFLAPIService(env.NFL_API_KEY, env.NFL_API_HOST);
    const projectionEngine = new ProjectionEngine(nflService);
    const efficiencyCalc = new EfficiencyCalculator();
    const matchupOddsGen = new MatchupOddsGenerator();

    const currentWeek = parseInt(env.DEFAULT_WEEK || '10');
    const currentSeason = parseInt(env.CURRENT_SEASON || '2024');

    // Step 1: Fetch and store NFL odds
    console.log('📊 Fetching NFL odds...');
    const teamOddsList = await oddsService.getTeamOddsByWeek(currentWeek, currentSeason);

    for (const teamOdds of teamOddsList) {
      await db.insertTeamOdds(teamOdds);
    }

    console.log(`✅ Stored ${teamOddsList.length} NFL team odds`);

    // Clear NFL odds cache
    await cache.delete(cache.generateNFLOddsKey(currentWeek, currentSeason));

    // Step 2: Process all tracked leagues
    const leagueRows = await db.getAllLeagues(currentSeason);
    console.log(`📋 Processing ${leagueRows.length} leagues...`);

    for (const leagueRow of leagueRows) {
      const leagueId = leagueRow.league_id;
      const scoringType = leagueRow.scoring_type;

      console.log(`  Processing league: ${leagueRow.name}`);

      try {
        // Get all teams in league
        const teamRows = await db.getTeamsByLeague(leagueId);

        // Step 3: Calculate efficiency metrics
        const leagueAvgPpg = 100.0; // Would calculate from actual league data
        const weeksRemaining = 4; // Would calculate based on current week

        const efficiencies = [];
        for (const teamRow of teamRows) {
          const team = {
            team_id: teamRow.team_id,
            league_id: teamRow.league_id,
            name: teamRow.name,
            manager_name: teamRow.manager_name,
            wins: teamRow.wins || 0,
            losses: teamRow.losses || 0,
            ties: teamRow.ties || 0,
            points_for: teamRow.points_for || 0,
            points_against: teamRow.points_against || 0,
            roster: [],
          };

          const efficiency = await efficiencyCalc.calculateTeamEfficiency(
            team,
            currentWeek,
            currentSeason,
            leagueAvgPpg,
            teamRows.map((t) => ({
              team_id: t.team_id,
              league_id: t.league_id,
              name: t.name,
              manager_name: t.manager_name,
              wins: t.wins || 0,
              losses: t.losses || 0,
              ties: t.ties || 0,
              points_for: t.points_for || 0,
              points_against: t.points_against || 0,
              roster: [],
            })),
            weeksRemaining
          );

          efficiencies.push(efficiency);
        }

        // Calculate league-wide rankings
        const rankedEfficiencies = efficiencyCalc.calculateLeagueRankings(efficiencies, weeksRemaining);

        // Store efficiency metrics
        for (const eff of rankedEfficiencies) {
          await db.insertTeamEfficiency(eff);
        }

        // Clear efficiency cache for this league
        await cache.delete(cache.generateEfficiencyKey(leagueId, currentWeek, currentSeason));

        console.log(`  ✅ Updated efficiency metrics for ${leagueId}`);
      } catch (error) {
        console.error(`  ❌ Error processing league ${leagueId}:`, error);
      }
    }

    console.log('✅ Daily update complete!');
  } catch (error) {
    console.error('❌ Error during daily update:', error);
    throw error;
  }
}
