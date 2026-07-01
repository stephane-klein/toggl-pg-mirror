import { logger } from "$lib/backend/logger.js";
import { sql } from "$lib/backend/pg.js";
import { startSyncDaemon, stopSyncDaemon } from "$lib/backend/sync.js";

const pollIntervalSeconds = parseInt(process.env.TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS || "600", 10);

logger.info({ pollIntervalSeconds }, "Starting sync daemon");

startSyncDaemon(pollIntervalSeconds);

process.on("sveltekit:shutdown", async () => {
    logger.info("Shutting down sync daemon");
    stopSyncDaemon();
    await sql.end();
});

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    return resolve(event);
}
