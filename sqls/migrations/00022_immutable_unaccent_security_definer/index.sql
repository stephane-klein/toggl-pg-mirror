-- Make immutable_unaccent SECURITY DEFINER so the read-only MCP reader role can
-- use it for fuzzy accent-insensitive search without direct EXECUTE on the
-- unaccent extension function (which the app role may be unable to grant when
-- the extension is owned by another role, e.g. on a managed CNPG cluster).
CREATE OR REPLACE FUNCTION immutable_unaccent(input_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SECURITY DEFINER
SET search_path FROM CURRENT
RETURN unaccent(input_text);