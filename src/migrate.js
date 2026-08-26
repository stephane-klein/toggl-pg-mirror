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

await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${POSTGRES_SCHEMA}`);

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
