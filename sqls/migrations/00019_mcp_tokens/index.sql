CREATE TABLE IF NOT EXISTS mcp_tokens (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT                     NOT NULL,
    token_hash TEXT                     NOT NULL UNIQUE,
    last_used  TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON mcp_tokens (user_id);