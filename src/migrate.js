#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import shift from "postgres-shift";
import { logger } from "./lib/server/logger.js";
import { POSTGRES_SCHEMA, sql, waitForDb } from "./lib/server/pg.js";

const MIGRATIONS_PATH = fileURLToPath(new URL("../sqls/migrations", import.meta.url));
const FUNCTIONS_PATH = fileURLToPath(new URL("../sqls/functions.sql", import.meta.url));

const SCHEMA_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

await waitForDb();

if (!SCHEMA_REGEX.test(POSTGRES_SCHEMA)) {
    logger.error({ schema: POSTGRES_SCHEMA }, "Invalid PostgreSQL schema name");
    process.exit(1);
}

// Only create the schema when absent; CREATE SCHEMA IF NOT EXISTS would emit a
// "already exists, skipping" NOTICE on every run once the schema is present.
const [{ exists }] = await sql`
    SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = ${POSTGRES_SCHEMA}) AS exists
`;
if (!exists) {
    await sql.unsafe(`CREATE SCHEMA ${POSTGRES_SCHEMA}`);
}

try {
    await shift({
        sql,
        path: MIGRATIONS_PATH,
        before: ({ migration_id, name }) => {
            logger.info(
                {
                    migration_id,
                    name,
                },
                "Migrating",
            );
        },
    });
    logger.info("Migrations done");

    logger.info("Loading SQL functions");
    await sql.begin(async (tx) => {
        await tx.file(FUNCTIONS_PATH);
    });
    logger.info("SQL functions loaded");
} catch (err) {
    logger.error({ err }, "Migration failed");
    process.exit(1);
}

process.exit(0);
