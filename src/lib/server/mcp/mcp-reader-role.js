import { logger } from "$lib/backend/logger.js";
import { POSTGRES_SCHEMA, sql } from "$lib/backend/pg.js";

export const MCP_READER_ROLE_ENV = "TOGGL_PG_MIRROR_MCP_READER_POSTGRES_ROLE";
export const MCP_READER_PASSWORD_ENV = "TOGGL_PG_MIRROR_MCP_READER_POSTGRES_PASSWORD";
export const MCP_READER_DEFAULT_ROLE = "toggl_mcp_reader";

const ROLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SCHEMA_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function escapeSqlString(value) {
    return value.replace(/'/g, "''");
}

export async function ensureMcpReaderRole() {
    const role = process.env[MCP_READER_ROLE_ENV] || MCP_READER_DEFAULT_ROLE;
    const password = process.env[MCP_READER_PASSWORD_ENV];

    if (!password) {
        logger.warn(
            { role, env: MCP_READER_PASSWORD_ENV },
            "MCP reader role not created — password env var not set, MCP read-only access disabled",
        );
        return;
    }

    if (!ROLE_NAME_REGEX.test(role) || !SCHEMA_NAME_REGEX.test(POSTGRES_SCHEMA)) {
        logger.error({ role, schema: POSTGRES_SCHEMA }, "Invalid role or schema name, MCP reader role not created");
        return;
    }

    try {
        await sql.unsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${escapeSqlString(role)}') THEN
                    CREATE ROLE "${role}" LOGIN;
                END IF;
            END
            $$;
            ALTER ROLE "${role}" WITH LOGIN PASSWORD '${escapeSqlString(password)}';
            GRANT USAGE ON SCHEMA "${POSTGRES_SCHEMA}" TO "${role}";
            GRANT SELECT ON "${POSTGRES_SCHEMA}".time_entries TO "${role}";
            -- Fuzzy-search helpers (immutable wrappers + the underlying unaccent
            -- extension function): granted explicitly because functions.sql
            -- revokes PUBLIC EXECUTE by default. Re-applied on every start.
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_unaccent(text) TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_lower(text) TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_lower(text[]) TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".unaccent(text) TO "${role}";
            ALTER ROLE "${role}" SET statement_timeout = '10s';
            ALTER ROLE "${role}" SET idle_in_transaction_session_timeout = '10s';
            ALTER ROLE "${role}" SET default_transaction_read_only = on;
        `);
        logger.info({ role, schema: POSTGRES_SCHEMA }, "MCP reader role ensured");
    } catch (err) {
        logger.error({ err, role }, "Failed to create MCP reader role");
    }
}
