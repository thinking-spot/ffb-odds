import { Hono } from 'hono';
import { Env, MatchupSchema } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';

const matchups = new Hono<{ Bindings: Env }>();

matchups.get('/league/:leagueId', async (c) => {
  try {
    const leagueId = c.req.param('leagueId');
    const week = parseInt(c.req.query('week') || '10');
    const season = parseInt(c.req.query('season') || '2024');

    const db = new DatabaseQueries(c.env.DB);
    const matchupRows = await db.getMatchupsByLeagueWeek(leagueId, week, season);

    const matchups = matchupRows.map((row: any) => MatchupSchema.parse(row));

    return c.json(matchups);
  } catch (error: any) {
    console.error('Error getting matchups:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

matchups.get('/:matchupId', async (c) => {
  try {
    const matchupId = c.req.param('matchupId');

    const db = new DatabaseQueries(c.env.DB);
    const matchupRow = await db.getMatchup(matchupId);

    if (!matchupRow) {
      return c.json({ error: 'Matchup not found' }, 404);
    }

    const matchup = MatchupSchema.parse(matchupRow);
    return c.json(matchup);
  } catch (error: any) {
    console.error('Error getting matchup:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default matchups;
