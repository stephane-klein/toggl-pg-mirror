import { sql } from "$lib/backend/pg.js";

const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 10;
const MAX_LIMIT = 200;

export async function load({ url }) {
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");

    const rawLimit = Number.parseInt(url.searchParams.get("limit"), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, rawLimit)) : DEFAULT_LIMIT;

    let entries;
    let prevCursor;
    let nextCursor;

    if (before) {
        const cursor = decodeCursor(before);
        const rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              AND (started_at, id) < (${cursor.startedAt}::timestamptz, ${cursor.id})
            ORDER BY started_at DESC, id DESC
            LIMIT ${limit + 1}
          `;
        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        entries = rows;
        prevCursor = entries.length > 0 ? encodeCursor(entries[0].started_at_txt, entries[0].id) : null;
        nextCursor =
            hasMore && entries.length > 0
                ? encodeCursor(entries[entries.length - 1].started_at_txt, entries[entries.length - 1].id)
                : null;
    } else if (after) {
        const cursor = decodeCursor(after);
        const rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              AND (started_at, id) > (${cursor.startedAt}::timestamptz, ${cursor.id})
            ORDER BY started_at ASC, id ASC
            LIMIT ${limit + 1}
          `;
        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        rows.reverse();
        entries = rows;
        prevCursor = hasMore && entries.length > 0 ? encodeCursor(entries[0].started_at_txt, entries[0].id) : null;
        nextCursor =
            entries.length > 0
                ? encodeCursor(entries[entries.length - 1].started_at_txt, entries[entries.length - 1].id)
                : null;
    } else {
        const rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
            ORDER BY started_at DESC, id DESC
            LIMIT ${limit + 1}
          `;
        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        entries = rows;
        prevCursor = null;
        nextCursor =
            hasMore && entries.length > 0
                ? encodeCursor(entries[entries.length - 1].started_at_txt, entries[entries.length - 1].id)
                : null;
    }

    return { entries, prevCursor, nextCursor, limit };
}

function encodeCursor(startedAt, id) {
    return Buffer.from(JSON.stringify({ startedAt, id })).toString("base64url");
}

function decodeCursor(raw) {
    try {
        const { startedAt, id } = JSON.parse(Buffer.from(raw, "base64url").toString());
        return { startedAt, id: Number(id) };
    } catch {
        return null;
    }
}
