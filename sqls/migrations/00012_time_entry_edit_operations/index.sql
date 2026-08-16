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

-- Look up all operations that touched a given entry.
CREATE INDEX IF NOT EXISTS idx_time_entry_edit_operation_entries_entry_id
    ON time_entry_edit_operation_entries (entry_id);