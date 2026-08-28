-- GIN trigram index on the normalized tag name for the /tags search field.
-- immutable_unaccent makes the index accent- and case-insensitive and IMMUTABLE
-- (required for an index expression). Serves list_tags() with
-- immutable_unaccent(t.name) ILIKE immutable_unaccent('%' || _q || '%').
-- pg_trgm and immutable_unaccent already exist (migrations 00005, 00022).
CREATE INDEX IF NOT EXISTS idx_time_entry_tags_name_unaccent_trgm
    ON time_entry_tags USING GIN (immutable_unaccent(name) gin_trgm_ops);
