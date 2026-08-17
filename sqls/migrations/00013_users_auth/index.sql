-- Authentication: users, sessions and API tokens.
-- Modeled on the skeleton auth system (Lucia-style sessions).
CREATE TABLE IF NOT EXISTS users (
    id            TEXT                     NOT NULL PRIMARY KEY,
    email         TEXT                     NOT NULL UNIQUE,
    display_name  TEXT                     NOT NULL,
    password_hash TEXT,
    -- OIDC columns: reserved for future use (Sign in with Authelia).
    oidc_issuer   TEXT,
    oidc_subject  TEXT,
    -- locale: reserved for future i18n support.
    locale        TEXT,
    is_active     BOOLEAN                  NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT at_least_one_auth CHECK (
        password_hash IS NOT NULL OR (oidc_issuer IS NOT NULL AND oidc_subject IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oidc ON users (oidc_issuer, oidc_subject)
    WHERE oidc_issuer IS NOT NULL AND oidc_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

CREATE TABLE IF NOT EXISTS api_tokens (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT                     NOT NULL,
    token_hash TEXT                     NOT NULL UNIQUE,
    last_used  TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens (user_id);