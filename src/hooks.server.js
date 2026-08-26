import { sequence } from "@sveltejs/kit/hooks";
import { SESSION_COOKIE_NAME, validateApiToken, validateSession } from "$lib/server/auth.js";
import { logger } from "$lib/server/logger.js";
import { verifySmtpConnection } from "$lib/server/mailer.js";
import { sql } from "$lib/server/pg.js";
import { startSyncDaemon, stopSyncDaemon } from "$lib/server/sync.js";
import { ensureMcpReaderRole } from "$lib/server/mcp/mcp-reader-role.js";
import { togglIsConfigured } from "$lib/server/toggl-client.js";
import { runWithMetrics as runWithPgMetrics, summarize as summarizePgMetrics } from "$lib/server/pg-metrics.js";

const pollIntervalSeconds = parseInt(process.env.TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS || "600", 10);

await ensureMcpReaderRole();

if (togglIsConfigured) {
    logger.info({ pollIntervalSeconds }, "Starting sync daemon");
    startSyncDaemon(pollIntervalSeconds);
} else {
    logger.warn("Sync daemon not started — TOGGL_PG_MIRROR_TOGGL_API_TOKEN not set, Toggl API features disabled");
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
            if (session.renewed) {
                event.cookies.set(SESSION_COOKIE_NAME, session.id, {
                    path: "/",
                    httpOnly: true,
                    sameSite: "lax",
                    secure: process.env.NODE_ENV === "production",
                    maxAge: 30 * 24 * 60 * 60,
                });
            }

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
    const response = await resolve(event);

    // Prevent the one-time magic-login token (carried in the callback URL) from
    // leaking to third-party sites via the Referer header of subsequent requests.
    response.headers.set("Referrer-Policy", "no-referrer");

    return response;
}

export const handle = sequence(authHandle, metricsHandle, requestHandler);

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ status, error, event }) {
    const pathname = event.url.pathname;

    // MCP clients probe OAuth/.well-known discovery endpoints before connecting.
    // We authenticate with a Bearer header (not OAuth), so these always 404 and
    // would otherwise spam the logs. Silence them.
    if (status === 404 && pathname.includes(".well-known")) {
        return;
    }

    const formattedText = `\n\x1b[1;31m[${status}] ${event.request.method} ${pathname}\x1b[0m`;
    console.error(status === 404 ? formattedText : `${formattedText}\n${error.stack}`);
}
