-- Partial index on non-deleted entries ordered by (started_at, id).
-- Serves the time-entries page render: index-only count (total), index-only
-- presence probes, and index-ordered keyset pagination (page). The existing
-- idx_time_entries_started_at_id stays for other scans.
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at_id_active
    ON time_entries (started_at DESC, id DESC)
    WHERE deleted_at IS NULL;
