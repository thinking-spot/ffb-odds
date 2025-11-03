import { Hono } from 'hono';
import { Env, TeamEfficiencySchema } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';
import { CacheService } from '../services/cache';

const efficiency = new Hono<{ Bindings: Env }>();

efficiency.get('/league/:leagueId', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');
    const week = parseInt(c.req.query('week') || '10');
    const season = parseInt(c.req.query('season') || '2024');

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);

    // Try cache first
    const cacheKey = cache.generateEfficiencyKey(leagueId, week, season);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Get from database
    const efficiencyRows = await db.getTeamEfficiencyByLeague(leagueId, week, season);
    const efficiencies = efficiencyRows.map((row: any) => TeamEfficiencySchema.parse(row));

    // Cache for 1 hour
    await cache.set(cacheKey, efficiencies, 3600);

    return c.json(efficiencies);
  } catch (error: any) {
    console.error('Error getting league efficiency:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

efficiency.get('/team/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const week = parseInt(c.req.query('week') || '10');
    const season = parseInt(c.req.query('season') || '2024');

    const db = new DatabaseQueries(c.env.DB);
    const efficiencyRow = await db.getTeamEfficiency(teamId, week, season);

    if (!efficiencyRow) {
      return c.json({ error: 'Team efficiency data not found' }, 404);
    }

    const teamEfficiency = TeamEfficiencySchema.parse(efficiencyRow);
    return c.json(teamEfficiency);
  } catch (error: any) {
    console.error('Error getting team efficiency:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default efficiency;
