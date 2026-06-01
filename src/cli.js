#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { sql } from "./pg.js";

yargs(hideBin(process.argv))
    .env("TOGGL_PG_MIRROR")
    .option("postgres-url", {
        type: "string",
        description: "PostgreSQL connection URL",
    })
    .command(
        "import <file>",
        "Import a Toggl CSV export",
        () => {},
        async () => {
            await sql`SELECT 1`;
            console.log("import command: database connection OK");
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
    .demandCommand(1, "Use one of the available commands")
    .epilogue(`
Environment variables:
  TOGGL_PG_MIRROR_POSTGRES_URL  PostgreSQL connection URL (e.g. postgres://user:pass@localhost:5432/db)
`)
    .parse();
