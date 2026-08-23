import { sequence } from "@sveltejs/kit/hooks";
import { SESSION_COOKIE_NAME, validateApiToken, validateSession } from "$lib/backend/auth.js";
import { logger } from "$lib/backend/logger.js";
import { verifySmtpConnection } from "$lib/backend/mailer.js";
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

verifySmtpConnection();

process.on("sveltekit:shutdown", async () => {
    logger.info("Shutting down sync daemon");
    stopSyncDaemon();
    await sql.end();
});

async function authHandle({ event, resolve }) {
    event.locals.user = null;

    const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

    if (sessionId) {
        const session = await validateSession(sessionId);

        if (session) {
            const [user] = await sql`SELECT id, email, display_name FROM users WHERE id = ${session.user_id}`;

            if (user) {
                event.locals.user = user;
            }
        } else {
            event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
        }
    }

    if (!event.locals.user) {
        const authHeader = event.request.headers.get("Authorization");

        if (authHeader?.startsWith("Bearer ")) {
            const raw = authHeader.slice(7);
            const token = await validateApiToken(raw);

            if (token?.expired) {
                event.locals.authFailure = "expired";
            } else if (token) {
                const [user] = await sql`SELECT id, email, display_name FROM users WHERE id = ${token.user_id}`;

                if (user) {
                    event.locals.user = user;
                }
            }
        }
    }

    return resolve(event);
}

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

export const handle = sequence(authHandle, metricsHandle, requestHandler);
