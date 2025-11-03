import { Hono } from 'hono';
import { Env, MatchupOddsSchema, TeamOddsSchema } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';
import { CacheService } from '../services/cache';

const odds = new Hono<{ Bindings: Env }>();

odds.get('/matchup/:matchupId', async (c) => {
  try {
    const matchupId = c.req.param('matchupId');

    const db = new DatabaseQueries(c.env.DB);
    const oddsRow = await db.getMatchupOdds(matchupId);

    if (!oddsRow) {
      return c.json({ error: 'Matchup odds not found' }, 404);
    }

    const matchupOdds = MatchupOddsSchema.parse(oddsRow);
    return c.json(matchupOdds);
  } catch (error: any) {
    console.error('Error getting matchup odds:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

odds.get('/league/:leagueId/week/:week', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');
    const week = parseInt(c.req.param('week'));
    const season = parseInt(c.req.query('season') || '2024');

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);

    // Try cache first
    const cacheKey = cache.generateMatchupOddsKey(leagueId, week, season);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Get from database
    const oddsRows = await db.getMatchupOddsByLeagueWeek(leagueId, week, season);
    const oddsList = oddsRows.map((row: any) => MatchupOddsSchema.parse(row));

    // Cache for 30 minutes
    await cache.set(cacheKey, oddsList, 1800);

    return c.json(oddsList);
  } catch (error: any) {
    console.error('Error getting league week odds:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

odds.get('/nfl/week/:week', async (c) => {
  try {
    const week = parseInt(c.req.param('week'));
    const season = parseInt(c.req.query('season') || '2024');

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);

    // Try cache first
    const cacheKey = cache.generateNFLOddsKey(week, season);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Get from database
    const oddsRows = await db.getTeamOddsByWeek(week, season);
    const oddsList = oddsRows.map((row: any) => TeamOddsSchema.parse(row));

    // Cache for 1 hour
    await cache.set(cacheKey, oddsList, 3600);

    return c.json(oddsList);
  } catch (error: any) {
    console.error('Error getting NFL week odds:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default odds;
