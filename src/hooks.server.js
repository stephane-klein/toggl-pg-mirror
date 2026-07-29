import { sequence } from "@sveltejs/kit/hooks";
import { logger } from "$lib/backend/logger.js";
import { sql } from "$lib/backend/pg.js";
import { startSyncDaemon, stopSyncDaemon } from "$lib/backend/sync.js";
import { togglIsConfigured } from "$lib/backend/toggl-client.js";
import { runWithMetrics as runWithPgMetrics, summarize as summarizePgMetrics } from "$lib/server/pg-metrics.js";

const pollIntervalSeconds = parseInt(process.env.TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS || "600", 10);

if (togglIsConfigured) {
    logger.info({ pollIntervalSeconds }, "Starting sync daemon");
    startSyncDaemon(pollIntervalSeconds);
} else {
    logger.warn("Sync daemon not started — TOGGL_PG_MIRROR_TOGGL_API_TOKEN not set");
}

process.on("sveltekit:shutdown", async () => {
    logger.info("Shutting down sync daemon");
    stopSyncDaemon();
    await sql.end();
});

async function metricsHandle({ event, resolve }) {
    return runWithPgMetrics(async () => {
        const t0 = performance.now();

        const response = await resolve(event);

        const t1 = performance.now();
        const metrics = summarizePgMetrics();

        if (metrics) {
            const phase = event.isDataRequest ? "csr" : "ssr";

            response.headers.set(
                "Server-Timing",
                [
                    `${phase}-pgcount;dur=${metrics.sqlQueryCount}`,
                    `${phase}-pgtime;dur=${metrics.totalQueryMs.toFixed(1)}`,
                    `${phase}-processing;dur=${(t1 - t0).toFixed(1)}`,
                ].join(", "),
            );
        }
        return response;
    });
}

/** @type {import('@sveltejs/kit').Handle} */
async function requestHandler({ event, resolve }) {
    return resolve(event);
}

export const handle = sequence(metricsHandle, requestHandler);
