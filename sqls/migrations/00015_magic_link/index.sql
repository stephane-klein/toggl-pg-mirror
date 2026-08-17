CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT                     NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used       BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_user_id ON magic_link_tokens (user_id);
