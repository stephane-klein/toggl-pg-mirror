import { json } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";

export async function GET() {
    try {
        await sql`SELECT 1`;
        return json({ status: "ok", ready: true });
    } catch {
        return new Response(JSON.stringify({ status: "error", ready: false }), { status: 503 });
    }
}
