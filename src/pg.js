import postgres from "postgres";

import { logger } from "./logger.js";

const POSTGRES_URL = process.env.TOGGL_PG_MIRROR_POSTGRES_URL;
export const POSTGRES_SCHEMA = process.env.TOGGL_PG_MIRROR_POSTGRES_SCHEMA || "public";

export const sql = postgres(POSTGRES_URL, {
    idle_timeout: 1,
    connection: {
        search_path: POSTGRES_SCHEMA,
    },
});

export async function waitForDb(maxRetries = 10, delayMs = 1000) {
    logger.info(`Attempting to connect to ${POSTGRES_URL.replace(/\/\/.*:/, "//xxxxx:")}`);

    for (let i = 1; i <= maxRetries; i++) {
        try {
            await sql`SELECT 1`;
            return;
        } catch (err) {
            if (i === maxRetries) throw err;
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
