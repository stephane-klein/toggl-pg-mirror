import { n as logger, t as sql } from "../chunks/pg.js";
import { i as togglIsConfigured, n as startSyncDaemon, r as stopSyncDaemon } from "../chunks/sync.js";
//#region src/hooks.server.js
var pollIntervalSeconds = parseInt(process.env.TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS || "600", 10);
if (togglIsConfigured) {
	logger.info({ pollIntervalSeconds }, "Starting sync daemon");
	startSyncDaemon(pollIntervalSeconds);
} else logger.warn("Sync daemon not started — TOGGL_PG_MIRROR_TOGGL_API_TOKEN not set");
process.on("sveltekit:shutdown", async () => {
	logger.info("Shutting down sync daemon");
	stopSyncDaemon();
	await sql.end();
});
/** @type {import('@sveltejs/kit').Handle} */
async function handle({ event, resolve }) {
	return resolve(event);
}
//#endregion
export { handle };
