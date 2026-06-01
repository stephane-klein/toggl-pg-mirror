import { t as sql } from "../../../../../chunks/pg.js";
import { t as isSyncDaemonRunning } from "../../../../../chunks/sync.js";
import { json } from "@sveltejs/kit";
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
//#endregion
export { GET };
