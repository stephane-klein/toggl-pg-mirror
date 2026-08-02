-- Enforce temporal integrity: a running entry has no ended_at; otherwise an
-- entry must not end before it starts.
ALTER TABLE time_entries
    ADD CONSTRAINT time_entries_ended_at_check
    CHECK (ended_at IS NULL OR ended_at >= started_at);
