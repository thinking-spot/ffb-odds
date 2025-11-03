import { Hono } from 'hono';
import { Env, LeagueSchema, TeamSchema } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';
import { YahooFantasyService } from '../services/yahoo';
import { CacheService } from '../services/cache';

const leagues = new Hono<{ Bindings: Env }>();

leagues.post('/', async (c) => {
  try {
    const leagueId = c.req.query('league_id');
    const season = parseInt(c.req.query('season') || '2024');

    if (!leagueId) {
      return c.json({ error: 'league_id is required' }, 400);
    }

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);
    const yahooService = new YahooFantasyService();

    // Fetch league from Yahoo
    const league = await yahooService.getLeague(leagueId, season);
    if (!league) {
      return c.json({ error: 'League not found or not accessible' }, 404);
    }

    // Validate with Zod
    const validatedLeague = LeagueSchema.parse(league);

    // Store in database
    await db.insertLeague(validatedLeague);

    // Store teams
    for (const team of validatedLeague.teams) {
      await db.insertTeam(team);
    }

    // Cache the league
    await cache.set(cache.generateLeagueKey(leagueId), validatedLeague, 3600);

    return c.json(validatedLeague, 201);
  } catch (error: any) {
    console.error('Error adding league:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

leagues.get('/', async (c) => {
  try {
    const season = c.req.query('season') ? parseInt(c.req.query('season')!) : undefined;

    const db = new DatabaseQueries(c.env.DB);
    const leagueRows = await db.getAllLeagues(season);

    const leagues = leagueRows.map((row: any) => ({
      league_id: row.league_id,
      name: row.name,
      platform: row.platform,
      season: row.season,
      current_week: row.current_week,
      num_teams: row.num_teams,
      scoring_type: row.scoring_type,
      teams: [],
    }));

    return c.json(leagues);
  } catch (error: any) {
    console.error('Error getting leagues:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

leagues.get('/:leagueId', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);

    // Try cache first
    const cacheKey = cache.generateLeagueKey(leagueId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Get from database
    const leagueRow = await db.getLeague(leagueId);
    if (!leagueRow) {
      return c.json({ error: 'League not found' }, 404);
    }

    const teamRows = await db.getTeamsByLeague(leagueId);
    const teams = teamRows.map((t: any) => TeamSchema.parse(t));

    const league = {
      ...leagueRow,
      teams,
    };

    // Cache for 1 hour
    await cache.set(cacheKey, league, 3600);

    return c.json(league);
  } catch (error: any) {
    console.error('Error getting league:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

leagues.get('/:leagueId/teams', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');

    const db = new DatabaseQueries(c.env.DB);
    const teamRows = await db.getTeamsByLeague(leagueId);
    const teams = teamRows.map((t: any) => TeamSchema.parse(t));

    return c.json(teams);
  } catch (error: any) {
    console.error('Error getting teams:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

leagues.delete('/:leagueId', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');

    const db = new DatabaseQueries(c.env.DB);
    const cache = new CacheService(c.env.CACHE);

    await db.deleteLeague(leagueId);
    await cache.delete(cache.generateLeagueKey(leagueId));

    return c.json({ message: 'League deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting league:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default leagues;
