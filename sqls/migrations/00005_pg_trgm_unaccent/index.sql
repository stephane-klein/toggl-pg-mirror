CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- IMMUTABLE wrapper around unaccent() for use in a trigram GIN index
-- (PostgreSQL requires IMMUTABLE for index expressions; unaccent() is STABLE by default).
CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN unaccent(input_text);

CREATE INDEX IF NOT EXISTS idx_time_entries_description_unaccent_trgm
    ON time_entries USING GIN (immutable_unaccent(description) gin_trgm_ops);
