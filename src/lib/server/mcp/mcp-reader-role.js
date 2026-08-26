import { logger } from "$lib/server/logger.js";
import { POSTGRES_SCHEMA, sql } from "$lib/server/pg.js";

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

    const [current] = await sql`
        SELECT rolsuper, rolcreaterole FROM pg_roles WHERE rolname = current_user
    `;
    const canManageRoles = Boolean(current?.rolsuper || current?.rolcreaterole);

    const [existing] = await sql`SELECT 1 AS found FROM pg_roles WHERE rolname = ${role}`;

    if (!existing && !canManageRoles) {
        logger.error(
            { role, env: MCP_READER_PASSWORD_ENV },
            `Cannot create MCP reader role "${role}" — the current PostgreSQL role cannot CREATE ROLE. ` +
                "Provision the role yourself (e.g. via CloudNativePG spec.managed.roles) with a password " +
                "matching the password env var, then restart. MCP read-only access stays disabled.",
        );
        return;
    }

    try {
        // When the role was provisioned externally (e.g. CNPG managed.roles),
        // the app role cannot ALTER ROLE — its password comes from the same
        // secret, so it is already correct.
        if (canManageRoles) {
            await sql.unsafe(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${escapeSqlString(role)}') THEN
                        CREATE ROLE "${role}" LOGIN;
                    END IF;
                END
                $$;
                ALTER ROLE "${role}" WITH LOGIN PASSWORD '${escapeSqlString(password)}';
            `);
        }

        await sql.unsafe(`
            GRANT USAGE ON SCHEMA "${POSTGRES_SCHEMA}" TO "${role}";
            GRANT SELECT ON "${POSTGRES_SCHEMA}".time_entries TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_unaccent(text) TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_lower(text) TO "${role}";
            GRANT EXECUTE ON FUNCTION "${POSTGRES_SCHEMA}".immutable_lower(text[]) TO "${role}";
        `);

        // Best-effort: the app role may lack the right to ALTER ROLE when the
        // role was provisioned externally. The reader client also applies these
        // settings per connection, so a failure here is not blocking.
        try {
            await sql.unsafe(`
                ALTER ROLE "${role}" SET statement_timeout = '10s';
                ALTER ROLE "${role}" SET idle_in_transaction_session_timeout = '10s';
                ALTER ROLE "${role}" SET default_transaction_read_only = on;
            `);
        } catch (err) {
            logger.debug(
                { err, role },
                "Cannot set default session parameters on MCP reader role — applied per connection instead",
            );
        }

        logger.info({ role, schema: POSTGRES_SCHEMA }, "MCP reader role ensured");
    } catch (err) {
        logger.error({ err, role }, "Failed to create MCP reader role");
    }
}
