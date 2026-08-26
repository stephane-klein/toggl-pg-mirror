-- Normalized tags: replaces the TEXT[] tags column on time_entries with a
-- dimension table (time_entry_tags) + a join table (time_entry_tag_entries).
--
-- The dimension stores the exact case as received from Toggl (case-sensitive
-- identity, "Meeting" and "meeting" are distinct tags, mirroring Toggl's
-- semantics) and is the single source of truth for tag names. The join table
-- keeps one row per (entry, tag) plus the original array position so the
-- display order is preserved. Search/filters remain case-insensitive at read
-- time via lower(name).
--
-- No trigger: every write path (upsert_time_entries, importer.js,
-- csv-importer.js) maintains these tables explicitly through the
-- set_time_entry_tags() function. Soft-deleted entries are excluded: their
-- join rows are removed and orphaned dimension names purged on delete.

-- Dimension: one row per distinct tag (case-sensitive name).
CREATE TABLE time_entry_tags (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT         NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Join: one row per (entry, tag); position preserves the original array order.
CREATE TABLE time_entry_tag_entries (
    entry_id  BIGINT NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    tag_id    BIGINT NOT NULL REFERENCES time_entry_tags(id) ON DELETE CASCADE,
    position  INT    NOT NULL,
    PRIMARY KEY (entry_id, tag_id)
);

-- Reading the tags of a list of entries (array_agg ORDER BY position).
CREATE INDEX idx_time_entry_tag_entries_entry_id_position
    ON time_entry_tag_entries (entry_id, position);

-- Filtering entries by tag (semi-join on tag_id).
CREATE INDEX idx_time_entry_tag_entries_tag_id
    ON time_entry_tag_entries (tag_id);

-- Backfill: rebuild dimension + join from the existing TEXT[] tags column,
-- restricted to non-deleted entries (consistent with all hot paths).
INSERT INTO time_entry_tags (name)
SELECT DISTINCT t.tag
FROM time_entries te
CROSS JOIN LATERAL unnest(te.tags) AS t(tag)
WHERE te.deleted_at IS NULL;

INSERT INTO time_entry_tag_entries (entry_id, tag_id, position)
SELECT te.id, tgt.id, t.tag_ord - 1
FROM time_entries te
CROSS JOIN LATERAL unnest(te.tags) WITH ORDINALITY AS t(tag, tag_ord)
JOIN time_entry_tags tgt ON tgt.name = t.tag
WHERE te.deleted_at IS NULL;

-- Drop the now-redundant TEXT[] column and its GIN index.
DROP INDEX IF EXISTS idx_time_entries_tags_active;
ALTER TABLE time_entries DROP COLUMN tags;

-- immutable_lower(text[]) was created solely for the tags GIN index; it is now
-- unused (tag search matches on lower(name) at read time, without an index
-- expression on the array).
DROP FUNCTION IF EXISTS immutable_lower(text[]);
