#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createApiToken, generateId, hashPassword } from "./lib/backend/auth.js";
import { importCsv } from "./lib/backend/csv-importer.js";
import { parseDate } from "./lib/backend/date-parser.js";
import { importTimeEntries } from "./lib/backend/importer.js";
import { logger } from "./lib/backend/logger.js";
import { sql, waitForDb } from "./lib/backend/pg.js";
import { ping, togglIsConfigured } from "./lib/backend/toggl-client.js";

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
            if (!togglIsConfigured) {
                logger.error("Toggl API token not configured — set TOGGL_PG_MIRROR_TOGGL_API_TOKEN");
                process.exit(1);
            }

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
        "api-ping",
        "Test Toggl API access",
        () => {},
        async () => {
            if (!togglIsConfigured) {
                logger.error("Toggl API token not configured — set TOGGL_PG_MIRROR_TOGGL_API_TOKEN");
                process.exit(1);
            }

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
    .command(
        "add-user",
        "Create a user account",
        (yargs) =>
            yargs
                .option("email", {
                    type: "string",
                    demandOption: true,
                    description: "User email address",
                })
                .option("password", {
                    type: "string",
                    description:
                        "User password (optional; users without one sign in via magic link or reset their password)",
                    conflicts: "password-stdin",
                })
                .option("password-stdin", {
                    type: "boolean",
                    description: "Read password from stdin (mutually exclusive with --password)",
                    conflicts: "password",
                })
                .option("display-name", {
                    type: "string",
                    description: "Display name (defaults to email)",
                })
                .option("oidc-issuer", {
                    type: "string",
                    description: "OIDC issuer URL (reserved for future use)",
                })
                .option("oidc-subject", {
                    type: "string",
                    description: "OIDC subject identifier (reserved for future use)",
                })
                .check((argv) => {
                    if (argv["oidc-issuer"] && !argv["oidc-subject"]) {
                        throw new Error("--oidc-subject is required when --oidc-issuer is provided");
                    }

                    if (argv["oidc-subject"] && !argv["oidc-issuer"]) {
                        throw new Error("--oidc-issuer is required when --oidc-subject is provided");
                    }

                    return true;
                }),
        async (argv) => {
            await waitForDb();

            let passwordHash = null;

            if (argv.password) {
                logger.info("Hashing password...");
                passwordHash = await hashPassword(argv.password);
            } else if (argv["password-stdin"]) {
                logger.info("Reading password from stdin...");
                const chunks = [];
                for await (const chunk of process.stdin) {
                    chunks.push(chunk);
                }
                const password = Buffer.concat(chunks).toString("utf8").trim();
                if (!password) {
                    logger.error("No password provided via stdin");
                    process.exit(1);
                }
                passwordHash = await hashPassword(password);
            }

            const id = generateId();
            const displayName = argv["display-name"] || argv.email;

            logger.info({ email: argv.email, displayName }, "Creating user...");

            await sql`INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject)
                      VALUES (${id}, ${argv.email}, ${displayName}, ${passwordHash}, ${(argv["oidc-issuer"] || "").replace(/\/$/, "") || null}, ${argv["oidc-subject"] || null})`;

            logger.info({ id, email: argv.email }, "User created");

            await sql.end();
        },
    )
    .command(
        "create-api-token",
        "Create an API token for a user",
        (yargs) =>
            yargs
                .option("email", {
                    type: "string",
                    demandOption: true,
                    description: "User email address",
                })
                .option("name", {
                    type: "string",
                    demandOption: true,
                    description: "Token name (e.g. 'CI/CD deploy')",
                }),
        async (argv) => {
            await waitForDb();

            const [user] = await sql`SELECT id, email FROM users WHERE email = ${argv.email}`;

            if (!user) {
                logger.error({ email: argv.email }, "User not found");
                process.exit(1);
            }

            const token = await createApiToken(user.id, argv.name);

            logger.info({ name: argv.name }, "API token created");
            console.log("\nRaw token (shown once — store it safely):");
            console.log(token.raw);

            await sql.end();
        },
    )
    .demandCommand(1, "Use one of the available commands")
    .epilogue(
        `
Environment variables:
  TOGGL_PG_MIRROR_POSTGRES_URL              PostgreSQL connection URL (e.g. postgres://user:pass@localhost:5432/db)
  TOGGL_PG_MIRROR_POSTGRES_SCHEMA           PostgreSQL schema name (default: public)
  TOGGL_PG_MIRROR_TOGGL_API_TOKEN           Toggl API token
  TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS     Sync daemon polling interval in seconds (default: 600)
  TOGGL_PG_MIRROR_ADMIN_TOKEN               Admin token for the admin API (at least 32 characters)
`,
    )
    .parse();
