#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { importCsv } from "./csv-importer.js";
import { logger } from "./logger.js";
import { sql } from "./pg.js";
import { ping } from "./toggl-client.js";

yargs(hideBin(process.argv))
    .env("TOGGL_PG_MIRROR")
    .option("postgres-url", {
        type: "string",
        description: "PostgreSQL connection URL",
    })
    .command(
        "import <file>",
        "Import a Toggl CSV export",
        (yargs) =>
            yargs.positional("file", {
                type: "string",
                describe: "Path to the CSV file",
            }),
        async (argv) => {
            const filePath = argv.file;

            if (!filePath.toLowerCase().endsWith(".csv")) {
                logger.error({ filePath }, "File must have .csv extension");
                process.exit(1);
            }

            try {
                const result = await importCsv(filePath);
                logger.info(result, "CSV import completed");
                process.exit(0);
            } catch (err) {
                logger.error({ err, filePath }, "CSV import failed");
                process.exit(1);
            }
        },
    )
    .command(
        "sync",
        "Start periodic sync daemon",
        () => {},
        async () => {
            await sql`SELECT 1`;
            console.log("sync command: database connection OK");
        },
    )
    .command(
        "toggl ping",
        "Test Toggl API access",
        () => {},
        async () => {
            try {
                const user = await ping();
                logger.info({ email: user.email, name: user.name }, "Toggl API access OK");
                process.exit(0);
            } catch (err) {
                logger.error({ err }, "Toggl API access failed");
                process.exit(1);
            }
        },
    )
    .demandCommand(1, "Use one of the available commands")
    .epilogue(`
Environment variables:
  TOGGL_PG_MIRROR_POSTGRES_URL  PostgreSQL connection URL (e.g. postgres://user:pass@localhost:5432/db)
`)
    .parse();
