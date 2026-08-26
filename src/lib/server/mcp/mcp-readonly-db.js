import postgres from "postgres";

import { logger } from "$lib/server/logger.js";
import { MCP_READER_DEFAULT_ROLE, MCP_READER_PASSWORD_ENV, MCP_READER_ROLE_ENV } from "./mcp-reader-role.js";
import { POSTGRES_SCHEMA, sql } from "$lib/server/pg.js";

const POSTGRES_URL = process.env.TOGGL_PG_MIRROR_POSTGRES_URL;
const role = process.env[MCP_READER_ROLE_ENV] || MCP_READER_DEFAULT_ROLE;
const password = process.env[MCP_READER_PASSWORD_ENV];

function buildReaderUrl() {
    return POSTGRES_URL.replace(/\/\/[^@]+@/, `//${role}:${password}@`);
}

export const sqlReadonly = password
    ? postgres(buildReaderUrl(), {
          max: 5,
          idle_timeout: 5,
          max_lifetime: 60,
          connection: {
              search_path: POSTGRES_SCHEMA,
          },
      })
    : null;

if (POSTGRES_URL && !password) {
    logger.warn("MCP read-only DB client not created — password env var not set");
}

let cachedSchema = null;

export async function getTimeEntriesSchema() {
    if (cachedSchema) return cachedSchema;

    const rows = await sqlReadonly`
        SELECT a.attname AS column_name,
               format_type(a.atttypid, a.atttypmod) AS data_type
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = ${POSTGRES_SCHEMA}
          AND c.relname = 'time_entries'
          AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum`;

    cachedSchema = `time_entries(\n${rows.map(({ column_name, data_type }) => `  ${column_name}  ${data_type}`).join(",\n")}\n)`;
    return cachedSchema;
}

export async function recordMcpAccess({
    tokenId,
    userId,
    sessionId,
    clientName,
    clientVersion,
    ip,
    query,
    purpose,
    success,
}) {
    try {
        await sql`
            INSERT INTO mcp_access_log (token_id, user_id, session_id, client_name, client_version, ip, query, purpose, success)
            VALUES (${tokenId}, ${userId}, ${sessionId}, ${clientName}, ${clientVersion}, ${ip}, ${query}, ${purpose}, ${success})
        `;
    } catch (err) {
        logger.error({ err }, "Failed to record MCP access");
    }
}
