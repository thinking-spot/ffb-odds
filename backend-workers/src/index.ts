import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './models/schemas';

// Import routes
import leagues from './routes/leagues';
import matchups from './routes/matchups';
import odds from './routes/odds';
import efficiency from './routes/efficiency';
import oauth from './routes/oauth';

// Import scheduled tasks
import { dailyUpdate } from './scheduled/dailyUpdate';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: '*', // In production, specify your frontend domain
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// API routes
app.route('/api/v1/leagues', leagues);
app.route('/api/v1/matchups', matchups);
app.route('/api/v1/odds', odds);
app.route('/api/v1/efficiency', efficiency);
app.route('/auth', oauth);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Fantasy Football Vegas Odds API',
    version: '1.0.0',
    status: 'running',
    docs: '/docs',
    endpoints: {
      leagues: '/api/v1/leagues',
      matchups: '/api/v1/matchups',
      odds: '/api/v1/odds',
      efficiency: '/api/v1/efficiency',
      auth: '/auth',
    },
  });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// Cron trigger handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // This runs when the cron trigger fires (daily at 10am ET / 3pm UTC)
    console.log('🕒 Cron trigger fired at', new Date(event.scheduledTime).toISOString());

    ctx.waitUntil(
      dailyUpdate(env).catch((error) => {
        console.error('Cron job failed:', error);
      })
    );
  },
};
