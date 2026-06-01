import { s as sql } from '../../../../../chunks/pg.js-CeWEPSPu.js';
import { i as isSyncDaemonRunning } from '../../../../../chunks/sync.js-B8UtrgLT.js';
import { j as json } from '../../../../../chunks/utils.js-Z9qv_ujy.js';
import 'postgres';
import 'pino';
import 'pino-pretty';
import '../../../../../chunks/shared.js-CXWIPVHZ.js';
import '../../../../../chunks/uneval.js-CGAFo80M.js';

//#region src/routes/(infra)/-/ready/+server.js
async function GET() {
	let database;
	try {
		await sql`SELECT 1`;
		database = "ok";
	} catch {
		database = "error";
	}
	if (database === "error") return new Response(JSON.stringify({
		status: "error",
		ready: false,
		checks: {
			database: "error",
			sync: "unknown"
		}
	}), { status: 503 });
	return json({
		status: "ok",
		ready: true,
		checks: {
			database: "ok",
			sync: isSyncDaemonRunning() ? "ok" : "starting"
		}
	});
}

export { GET };
//# sourceMappingURL=_server.js-CU4AIwJ-.js.map
