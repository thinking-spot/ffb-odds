-- Add OAuth token storage to existing schema

-- OAuth Tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'bearer',
    expires_at INTEGER NOT NULL, -- Unix timestamp
    yahoo_guid TEXT, -- Yahoo user GUID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_yahoo_guid ON oauth_tokens(yahoo_guid);

-- Update trigger for oauth_tokens
CREATE TRIGGER IF NOT EXISTS update_oauth_tokens_timestamp
AFTER UPDATE ON oauth_tokens
BEGIN
    UPDATE oauth_tokens SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
