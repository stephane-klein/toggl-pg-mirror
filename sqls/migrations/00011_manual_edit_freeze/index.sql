-- Freeze marker for manual edits: when set, the sync importer must not
-- overwrite this entry (see importer.js toUpdate filter). Non-NULL = the entry
-- was edited locally and is frozen against Toggl sync until manually thawed.
ALTER TABLE time_entries
    ADD COLUMN manually_edited_at TIMESTAMPTZ DEFAULT NULL;
