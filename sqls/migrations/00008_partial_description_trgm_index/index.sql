-- Restrict the description trigram index to non-deleted entries: every trigram
-- search (page and total CTEs, nearest_day_with_entries) already filters on
-- deleted_at IS NULL, so the partial index serves all queries and stays small
-- as deletions accumulate.
DROP INDEX IF EXISTS idx_time_entries_description_unaccent_trgm;
CREATE INDEX idx_time_entries_description_unaccent_trgm
    ON time_entries USING GIN (immutable_unaccent(description) gin_trgm_ops)
    WHERE deleted_at IS NULL;
