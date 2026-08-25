CREATE TABLE IF NOT EXISTS mcp_access_log (
    id             BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token_id       TEXT    REFERENCES mcp_tokens(id) ON DELETE SET NULL,
    user_id        TEXT    REFERENCES users(id) ON DELETE SET NULL,
    session_id     TEXT,
    client_name    TEXT,
    client_version TEXT,
    ip             TEXT,
    query          TEXT NOT NULL,
    success        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_log_user_id ON mcp_access_log (user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_access_log_created_at ON mcp_access_log (created_at);