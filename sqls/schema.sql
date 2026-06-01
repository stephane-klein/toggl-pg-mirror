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
    deleted_at    TIMESTAMPTZ  DEFAULT NULL
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

-- Look up the full change history of a given time entry.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_entry_id
    ON time_entry_audit_log (entry_id);

-- Query recent changes across all entries, e.g. for incremental sync reconciliation.
CREATE INDEX IF NOT EXISTS idx_time_entry_audit_log_changed_at
    ON time_entry_audit_log (changed_at);
