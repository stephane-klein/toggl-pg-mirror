CREATE INDEX IF NOT EXISTS idx_time_entries_started_at_id
    ON time_entries (started_at DESC, id DESC);
