-- Extensions used by the schema (loaded idempotently; installed in the app schema).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- IMMUTABLE wrapper around unaccent() for use in a trigram GIN index
-- (PostgreSQL requires IMMUTABLE for index expressions; unaccent() is STABLE by default).
-- SECURITY DEFINER: the read-only MCP role uses it for fuzzy accent-insensitive
-- search without needing direct EXECUTE on the unaccent extension function.
CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SECURITY DEFINER
SET search_path FROM CURRENT
RETURN unaccent(input_text);

-- IMMUTABLE lowercase wrapper kept for the read-only MCP role's fuzzy search
-- (lower() is STABLE by default; PostgreSQL requires IMMUTABLE for index
-- expressions). The text[] overload was dropped in migration 00023 — tags are
-- no longer a TEXT[] column.
CREATE OR REPLACE FUNCTION immutable_lower(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN lower(input_text);

-- Bronze layer: raw Toggl time entries, mirrored as-is.
-- toggl_uid is the native Toggl API identifier, used as the natural deduplication key (NULL for CSV imports).
-- import_source tracks the ingestion channel: 'api_sync' (synced via Toggl API) or 'csv' (bulk CSV import).
CREATE TABLE IF NOT EXISTS time_entries (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    toggl_uid     BIGINT       UNIQUE,              -- NULL for CSV imports
    started_at    TIMESTAMPTZ  NOT NULL,
    ended_at      TIMESTAMPTZ,                      -- NULL while the entry is still running
    description   TEXT,
    import_source VARCHAR(10) NOT NULL CHECK (import_source IN ('api_sync', 'csv')),
    project       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ  DEFAULT NULL,
    manually_edited_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT time_entries_ended_at_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Normalized tags (replaces the time_entries.tags TEXT[] column, removed in
-- migration 00023): the dimension holds one row per distinct tag with the
-- exact case as received from Toggl (case-sensitive identity), and the join
-- table one row per (entry, tag) preserving the original array order via
-- position. There is no trigger: every write path maintains these tables
-- explicitly through set_time_entry_tags().
CREATE TABLE IF NOT EXISTS time_entry_tags (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT         NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_entry_tag_entries (
    entry_id  BIGINT NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    tag_id    BIGINT NOT NULL REFERENCES time_entry_tags(id) ON DELETE CASCADE,
    position  INT    NOT NULL,
    PRIMARY KEY (entry_id, tag_id)
);

-- Silver layer: records every modification to a time entry with full traceability.
-- source indicates who or what system made the change: 'toggl', 'manual', 'llm', or 'csv'.
CREATE TABLE IF NOT EXISTS time_entry_audit_log (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id      BIGINT       NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    source        TEXT         NOT NULL CHECK (source IN ('toggl', 'manual', 'llm', 'csv')),
    field_changed TEXT         NOT NULL,
    old_value     JSONB,
    new_value     JSONB,
    changed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Undo stack for user-initiated edits: each operation records the full
-- before/after state of every touched entry as JSON snapshots. Only bulk edits
-- are recorded for now; single edits can be added later (kind column).
-- Snapshots are never deleted: undone_at marks an operation as undone so the
-- same operation cannot be undone twice, but the rows stay for traceability.
CREATE TABLE IF NOT EXISTS time_entry_edit_operations (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind       TEXT         NOT NULL DEFAULT 'bulk_edit' CHECK (kind IN ('bulk_edit', 'single_edit')),
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    undone_at  TIMESTAMPTZ
);

-- One row per entry touched by an operation. The before/after snapshots mirror
-- the editable time_entries columns (started_at, ended_at, tags, description,
-- project). before_snapshot is what an undo restores; after_snapshot is kept as
-- the expected post-operation state (informational + future verification).
CREATE TABLE IF NOT EXISTS time_entry_edit_operation_entries (
    operation_id    BIGINT NOT NULL REFERENCES time_entry_edit_operations(id) ON DELETE CASCADE,
    entry_id        BIGINT NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    before_snapshot JSONB  NOT NULL,
    after_snapshot  JSONB  NOT NULL,
    PRIMARY KEY (operation_id, entry_id)
);

-- Sync windows filter by started_at to determine which entries to fetch from the API.
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at
    ON time_entries (started_at);

-- Full (started_at, id) keyset ordering; the hot path filters on deleted_at and
-- uses idx_time_entries_started_at_id_active instead.
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at_id
    ON time_entries (started_at DESC, id DESC);

-- Partial index on non-deleted entries ordered by (started_at, id): serves the
-- time-entries page render (index-only count, presence probes, keyset pagination).
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at_id_active
    ON time_entries (started_at DESC, id DESC)
    WHERE deleted_at IS NULL;

-- Accent-insensitive trigram search over entry descriptions (used by the _q filter),
-- restricted to non-deleted entries: all searches already filter deleted_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_time_entries_description_unaccent_trgm
    ON time_entries USING GIN (immutable_unaccent(description) gin_trgm_ops)
    WHERE deleted_at IS NULL;

-- Reading the tags of a list of entries (array_agg ORDER BY position).
CREATE INDEX IF NOT EXISTS idx_time_entry_tag_entries_entry_id_position
    ON time_entry_tag_entries (entry_id, position);

-- Filtering entries by tag (semi-join on tag_id).
CREATE INDEX IF NOT EXISTS idx_time_entry_tag_entries_tag_id
    ON time_entry_tag_entries (tag_id);

-- Look up the full change history of a given time entry.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_entry_id
    ON time_entry_audit_log (entry_id);

-- Query recent changes across all entries, e.g. for incremental sync reconciliation.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_changed_at
    ON time_entry_audit_log (changed_at);

-- Look up all operations that touched a given entry.
CREATE INDEX IF NOT EXISTS idx_time_entry_edit_operation_entries_entry_id
    ON time_entry_edit_operation_entries (entry_id);

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
    -- Per-user activity matrix categories [{ label, tag, color }] (NULL or
    -- [] means "not configured": no matrix is shown until categories are set).
    activity_matrix_categories JSONB,
    is_active     BOOLEAN                  NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS mcp_access_log (
    id             BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token_id       TEXT    REFERENCES mcp_tokens(id) ON DELETE SET NULL,
    user_id        TEXT    REFERENCES users(id) ON DELETE SET NULL,
    session_id     TEXT,
    client_name    TEXT,
    client_version TEXT,
    ip             TEXT,
    query          TEXT NOT NULL,
    purpose        TEXT,
    success        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_log_user_id ON mcp_access_log (user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_access_log_created_at ON mcp_access_log (created_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT                     NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used       BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id         TEXT                     NOT NULL PRIMARY KEY,
    user_id    TEXT                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT                     NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used       BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_user_id ON magic_link_tokens (user_id);

-- Anti-brute-force: records sign-in attempts (password + magic link) so the
-- server can throttle repeated failures per client IP and per email.
CREATE TABLE IF NOT EXISTS login_attempts (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip           TEXT         NOT NULL,
    email        TEXT         NOT NULL,
    action       TEXT         NOT NULL CHECK (action IN ('password', 'magic_link')),
    success      BOOLEAN      NOT NULL,
    attempted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
    ON login_attempts (ip, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email
    ON login_attempts (email, attempted_at DESC);
