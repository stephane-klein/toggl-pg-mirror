-- GIN index on the tags array, prerequisite for the upcoming tag search: serves
-- the @> (contains) and && (overlap) operators. Restricted to non-deleted entries
-- like the other hot-path indexes; GIN does not index empty arrays (~46% of rows).
CREATE INDEX IF NOT EXISTS idx_time_entries_tags_active
    ON time_entries USING GIN (tags)
    WHERE deleted_at IS NULL;
