-- Case-insensitive GIN index on the tags array for the tag search: serves the
-- @> (contains) and && (overlap) operators, matching tag names regardless of
-- case ('#EPI' finds 'epi...'). Restricted to non-deleted entries like the
-- other hot-path indexes; GIN does not index empty arrays (~46% of rows).
--
-- Replaces idx_time_entries_tags_active (migration 00009), which indexed the
-- raw tags column: exact-match only. immutable_lower is IMMUTABLE so it can be
-- used in an index expression, with both a text and a text[] overload so the
-- whole array is lowercased in one shot.
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

DROP INDEX IF EXISTS idx_time_entries_tags_active;

CREATE INDEX idx_time_entries_tags_active
    ON time_entries USING GIN (immutable_lower(tags))
    WHERE deleted_at IS NULL;
