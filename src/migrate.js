#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import shift from "postgres-shift";
import { logger } from "./lib/backend/logger.js";
import { POSTGRES_SCHEMA, sql, waitForDb } from "./lib/backend/pg.js";

await waitForDb();

const SCHEMA_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
if (!SCHEMA_REGEX.test(POSTGRES_SCHEMA)) {
    logger.error({ schema: POSTGRES_SCHEMA }, "Invalid PostgreSQL schema name");
    process.exit(1);
}

await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${POSTGRES_SCHEMA}`);

shift({
    sql,
    path: fileURLToPath(new URL("../sqls/migrations", import.meta.url)),
    before: ({ migration_id, name }) => {
        logger.info(
            {
                migration_id,
                name,
            },
            "Migrating",
        );
    },
})
    .then(() => {
        logger.info("Migrations done");
        process.exit(0);
    })
    .catch((err) => {
        logger.error(
            {
                err,
            },
            "Migration failed",
        );
        process.exit(1);
    });
