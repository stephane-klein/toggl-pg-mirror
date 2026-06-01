import postgres from 'postgres';
import pino from 'pino';
import pinoPretty from 'pino-pretty';

//#region src/lib/backend/logger.js
var prettyTransport = new pinoPretty({
	colorize: true,
	translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
	singleLine: true,
	ignore: "pid,hostname",
	sync: true
});
var logger = pino({ level: "info" }, process.env.NODE_ENV !== "production" ? prettyTransport : pino.destination(1));
//#endregion
//#region src/lib/backend/pg.js
var POSTGRES_URL = process.env.TOGGL_PG_MIRROR_POSTGRES_URL;
var sql = postgres(POSTGRES_URL, {
	idle_timeout: 1,
	connection: { search_path: process.env.TOGGL_PG_MIRROR_POSTGRES_SCHEMA || "public" }
});

export { logger as l, sql as s };
//# sourceMappingURL=pg.js-CeWEPSPu.js.map
