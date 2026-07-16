import { json } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";
import { isSyncDaemonRunning } from "$lib/backend/sync.js";

export async function GET() {
    let database;

    try {
        await sql`SELECT 1`;
        database = "ok";
    } catch {
        database = "error";
    }

    if (database === "error") {
        return new Response(
            JSON.stringify({ status: "error", ready: false, checks: { database: "error", sync: "unknown" } }),
            { status: 503 },
        );
    }

    return json({
        status: "ok",
        ready: true,
        checks: { database: "ok", sync: isSyncDaemonRunning() ? "ok" : "starting" },
    });
}
