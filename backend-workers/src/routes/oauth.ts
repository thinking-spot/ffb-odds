import { Hono } from 'hono';
import { Env } from '../models/schemas';
import { DatabaseQueries } from '../db/queries';

const oauth = new Hono<{ Bindings: Env }>();

/**
 * OAuth Configuration
 */
const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const YAHOO_USER_INFO_URL = 'https://api.login.yahoo.com/openid/v1/userinfo';

/**
 * Step 1: Redirect user to Yahoo for authorization
 * GET /auth/yahoo
 */
oauth.get('/yahoo', async (c) => {
  const clientId = c.env.YAHOO_CLIENT_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/callback`;

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in KV cache for verification (expires in 10 minutes)
  await c.env.CACHE.put(`oauth_state:${state}`, 'valid', { expirationTtl: 600 });

  // Build authorization URL
  const authUrl = new URL(YAHOO_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('language', 'en-us');
  authUrl.searchParams.set('state', state);

  // Redirect to Yahoo
  return c.redirect(authUrl.toString());
});

/**
 * Step 2: Handle OAuth callback from Yahoo
 * GET /auth/callback?code=xxx&state=xxx
 */
oauth.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    // Check for errors
    if (error) {
      return c.redirect(`${c.env.FRONTEND_URL}?error=${error}`);
    }

    if (!code || !state) {
      return c.redirect(`${c.env.FRONTEND_URL}?error=missing_parameters`);
    }

    // Verify state (CSRF protection)
    const storedState = await c.env.CACHE.get(`oauth_state:${state}`);
    if (!storedState) {
      return c.redirect(`${c.env.FRONTEND_URL}?error=invalid_state`);
    }

    // Delete used state
    await c.env.CACHE.delete(`oauth_state:${state}`);

    // Exchange code for tokens
    const redirectUri = `${c.req.url.split('/auth')[0]}/auth/callback`;
    const tokens = await exchangeCodeForTokens(
      code,
      redirectUri,
      c.env.YAHOO_CLIENT_ID,
      c.env.YAHOO_CLIENT_SECRET
    );

    // Get Yahoo user info
    const userInfo = await getYahooUserInfo(tokens.access_token);

    // Store tokens in database
    const db = new DatabaseQueries(c.env.DB);
    await db.upsertOAuthToken({
      user_id: userInfo.sub, // Yahoo user ID
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      yahoo_guid: userInfo.sub,
    });

    // Store user session in KV (expires in 7 days)
    const sessionId = crypto.randomUUID();
    await c.env.CACHE.put(
      `session:${sessionId}`,
      JSON.stringify({ user_id: userInfo.sub, yahoo_guid: userInfo.sub }),
      { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
    );

    // Redirect to frontend with session
    return c.redirect(`${c.env.FRONTEND_URL}?session=${sessionId}&success=true`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return c.redirect(`${c.env.FRONTEND_URL}?error=auth_failed`);
  }
});

/**
 * Get current user info from session
 * GET /auth/me
 */
oauth.get('/me', async (c) => {
  try {
    const sessionId = c.req.query('session');
    if (!sessionId) {
      return c.json({ error: 'No session' }, 401);
    }

    // Get session from KV
    const sessionData = await c.env.CACHE.get(`session:${sessionId}`, 'json');
    if (!sessionData) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    // Get user from database
    const db = new DatabaseQueries(c.env.DB);
    const token = await db.getOAuthToken(sessionData.user_id);

    if (!token) {
      return c.json({ error: 'No token found' }, 401);
    }

    return c.json({
      user_id: token.user_id,
      yahoo_guid: token.yahoo_guid,
      connected: true,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Logout
 * POST /auth/logout
 */
oauth.post('/logout', async (c) => {
  try {
    const sessionId = c.req.query('session');
    if (sessionId) {
      await c.env.CACHE.delete(`session:${sessionId}`);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Helper: Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<any> {
  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Helper: Get Yahoo user info
 */
async function getYahooUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(YAHOO_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * Helper: Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<any> {
  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

export default oauth;
