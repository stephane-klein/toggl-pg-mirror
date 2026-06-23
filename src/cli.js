#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { importCsv } from "./csv-importer.js";
import { parseDate } from "./date-parser.js";
import { startHealthServer, stopHealthServer } from "./health.js";
import { importTimeEntries } from "./importer.js";
import { logger } from "./logger.js";
import { startSyncDaemon, stopSyncDaemon } from "./sync.js";
import { ping } from "./toggl-client.js";

function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return null;
    const s = Number(seconds);
    if (Number.isNaN(s)) return null;
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")} min`;
    return `${m} min`;
}

function logQuota(quotaRemaining, quotaResetsIn) {
    if (quotaRemaining === null || quotaResetsIn === null) return;
    logger.info(
        { quotaRemaining, quotaResetsIn },
        `Toggl API quota: ${quotaRemaining} calls remaining, resets in ${formatDuration(quotaResetsIn)}`,
    );
}

yargs(hideBin(process.argv))
    .env("TOGGL_PG_MIRROR")
    .option("postgres-url", {
        type: "string",
        description: "PostgreSQL connection URL",
    })
    .command(
        "csv-import <file>",
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
        "api-import",
        "Import time entries from Toggl API",
        (yargs) =>
            yargs
                .option("debug", {
                    type: "boolean",
                    default: false,
                    describe: "Enable debug logging and show raw API response",
                })
                .option("start-date", {
                    type: "string",
                    default: "-48h",
                    describe: "Start date (YYYY-MM-DDTHH:MM or relative like -48h, -7d)",
                })
                .option("end-date", {
                    type: "string",
                    describe: "End date (YYYY-MM-DDTHH:MM or relative like -7d)",
                }),
        async (argv) => {
            if (argv.debug) {
                logger.level = "debug";
            }

            try {
                const startDate = parseDate(argv.startDate);
                const endDate = argv.endDate ? parseDate(argv.endDate) : new Date();

                logger.info({ startDate, endDate }, "Starting Toggl import");

                const result = await importTimeEntries({ startDate, endDate, debug: argv.debug });
                logger.info(result, "Toggl import completed");
                logQuota(result.quotaRemaining, result.quotaResetsIn);
                process.exit(0);
            } catch (err) {
                logger.error({ err }, "Toggl import failed");
                process.exit(1);
            }
        },
    )
    .command(
        "start-api-sync",
        "Start periodic sync daemon",
        () => {},
        async () => {
            const pollIntervalSeconds = parseInt(process.env.TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS || "600", 10); // 10 minutes by default

            logger.info({ pollIntervalSeconds }, "Sync daemon starting");

            startHealthServer();

            const handleShutdown = () => {
                logger.info("Shutdown signal received, stopping sync daemon...");
                stopHealthServer();
                stopSyncDaemon();
            };
            process.on("SIGINT", handleShutdown);
            process.on("SIGTERM", handleShutdown);

            await startSyncDaemon(pollIntervalSeconds);
        },
    )
    .command(
        "api-ping",
        "Test Toggl API access",
        () => {},
        async () => {
            try {
                const { user, quotaRemaining, quotaResetsIn } = await ping();
                logger.info({ email: user.email, name: user.name }, "Toggl API access OK");
                logQuota(quotaRemaining, quotaResetsIn);
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
  TOGGL_PG_MIRROR_POSTGRES_URL              PostgreSQL connection URL (e.g. postgres://user:pass@localhost:5432/db)
  TOGGL_PG_MIRROR_POSTGRES_SCHEMA           PostgreSQL schema name (default: public)
  TOGGL_PG_MIRROR_TOGGL_API_TOKEN           Toggl API token
  TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS     Sync daemon polling interval in seconds (default: 600)
  TOGGL_PG_MIRROR_HEALTH_PORT               Healthcheck HTTP server port (default: 8080)
`)
    .parse();
