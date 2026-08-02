-- Extensions used by the schema (loaded idempotently; installed in the app schema).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- IMMUTABLE wrapper around unaccent() for use in a trigram GIN index
-- (PostgreSQL requires IMMUTABLE for index expressions; unaccent() is STABLE by default).
CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN unaccent(input_text);

-- IMMUTABLE lowercase wrappers for the case-insensitive tags GIN index
-- (lower() is STABLE by default; PostgreSQL requires IMMUTABLE for index expressions).
CREATE OR REPLACE FUNCTION immutable_lower(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN lower(input_text);

CREATE OR REPLACE FUNCTION immutable_lower(input_texts text[]) RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN (
    -- COALESCE: array_agg over an empty array yields NULL, which would make
    -- "tags && NOT ..." exclude empty-tag rows (~46%) from negated filters.
    SELECT COALESCE(array_agg(lower(elem) ORDER BY ord), '{}'::text[])
    FROM unnest(input_texts) WITH ORDINALITY AS e(elem, ord)
);

-- Bronze layer: raw Toggl time entries, mirrored as-is.
-- toggl_uid is the native Toggl API identifier, used as the natural deduplication key (NULL for CSV imports).
-- import_source tracks the ingestion channel: 'api_sync' (synced via Toggl API) or 'csv' (bulk CSV import).
CREATE TABLE IF NOT EXISTS time_entries (
    id            BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    toggl_uid     BIGINT       UNIQUE,              -- NULL for CSV imports
    started_at    TIMESTAMPTZ  NOT NULL,
    ended_at      TIMESTAMPTZ,                      -- NULL while the entry is still running
    tags          TEXT[]       NOT NULL DEFAULT '{}',
    description   TEXT,
    import_source VARCHAR(10) NOT NULL CHECK (import_source IN ('api_sync', 'csv')),
    project       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ  DEFAULT NULL,
    CONSTRAINT time_entries_ended_at_check CHECK (ended_at IS NULL OR ended_at >= started_at)
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

-- Case-insensitive GIN index on the tags array for tag search (serves the @>
-- and && predicates, matching tag names regardless of case); restricted to
-- non-deleted entries like the other hot-path indexes.
CREATE INDEX IF NOT EXISTS idx_time_entries_tags_active
    ON time_entries USING GIN (immutable_lower(tags))
    WHERE deleted_at IS NULL;

-- Look up the full change history of a given time entry.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_entry_id
    ON time_entry_audit_log (entry_id);

-- Query recent changes across all entries, e.g. for incremental sync reconciliation.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_changed_at
    ON time_entry_audit_log (changed_at);
