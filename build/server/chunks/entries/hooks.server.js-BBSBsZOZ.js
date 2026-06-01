import { l as logger, s as sql } from '../chunks/pg.js-CeWEPSPu.js';
import { t as togglIsConfigured, s as startSyncDaemon, a as stopSyncDaemon } from '../chunks/sync.js-B8UtrgLT.js';
import 'postgres';
import 'pino';
import 'pino-pretty';

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

export { handle };
//# sourceMappingURL=hooks.server.js-BBSBsZOZ.js.map
