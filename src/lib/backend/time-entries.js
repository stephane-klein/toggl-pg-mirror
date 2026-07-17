import { sql } from "./pg.js";

const DEFAULT_LIMIT = 50;
const MIN_LIMIT = 10;
const MAX_LIMIT = 200;

const AUTO_LIMITS = { day: 500, week: 500, month: 50, range: 50 };

export function parseLimit(raw, mode = "day") {
    if (raw === "auto" || raw === null || raw === undefined) {
        return AUTO_LIMITS[mode] || DEFAULT_LIMIT;
    }
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) {
        return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, n));
    }
    return AUTO_LIMITS[mode] || DEFAULT_LIMIT;
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

export async function hasEntries(from, to) {
    const [row] = await sql`
        SELECT 1 AS found
        FROM time_entries
        WHERE deleted_at IS NULL
          AND started_at >= ${from}::timestamptz
          AND started_at <  ${to}::timestamptz
        LIMIT 1
    `;
    return !!row;
}

export async function nearestDayWithEntries(fromDate) {
    const [before, after] = await Promise.all([
        sql`SELECT started_at::date::text AS day
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at::date < ${fromDate}::date
            ORDER BY started_at DESC
            LIMIT 1`,
        sql`SELECT started_at::date::text AS day
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at::date > ${fromDate}::date
            ORDER BY started_at ASC
            LIMIT 1`,
    ]);

    if (!before.length && !after.length) return null;
    if (!before.length) return after[0].day;
    if (!after.length) return before[0].day;

    const f = new Date(fromDate);
    const p = new Date(before[0].day);
    const n = new Date(after[0].day);

    return Math.abs(f - p) <= Math.abs(f - n) ? before[0].day : after[0].day;
}

export async function fetchEntries({ from, to, before, after, limit, sort = "asc" }) {
    const cursor = before ? decodeCursor(before) : after ? decodeCursor(after) : null;
    const isAsc = sort === "asc";

    let rows;
    if (before && cursor) {
        rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= ${from}::timestamptz
              AND started_at <  ${to}::timestamptz
              AND (started_at, id) < (${cursor.startedAt}::timestamptz, ${cursor.id})
            ORDER BY started_at DESC, id DESC
            LIMIT ${limit + 1}
          `;
    } else if (after && cursor) {
        rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= ${from}::timestamptz
              AND started_at <  ${to}::timestamptz
              AND (started_at, id) > (${cursor.startedAt}::timestamptz, ${cursor.id})
            ORDER BY started_at ASC, id ASC
            LIMIT ${limit + 1}
          `;
    } else {
        const orderDir = isAsc ? sql`ASC` : sql`DESC`;
        rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= ${from}::timestamptz
              AND started_at <  ${to}::timestamptz
            ORDER BY started_at ${orderDir}, id ${orderDir}
            LIMIT ${limit + 1}
          `;
    }

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    if (before && cursor) rows.reverse();
    if (after && cursor && !isAsc) rows.reverse();

    const entries = rows;

    const first = entries.length > 0 ? entries[0] : null;
    const last = entries.length > 0 ? entries[entries.length - 1] : null;

    let prevCursor = null;
    let nextCursor = null;

    if (isAsc) {
        if (!before && !after) {
            prevCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
            nextCursor = null;
        } else if (before) {
            prevCursor = last ? encodeCursor(last.started_at_txt, last.id) : null;
            nextCursor = hasMore && first ? encodeCursor(first.started_at_txt, first.id) : null;
        } else if (after) {
            prevCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
            nextCursor = first ? encodeCursor(first.started_at_txt, first.id) : null;
        }
    } else {
        if (!before && !after) {
            prevCursor = null;
            nextCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
        } else if (before) {
            prevCursor = first ? encodeCursor(first.started_at_txt, first.id) : null;
            nextCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
        } else if (after) {
            prevCursor = hasMore && first ? encodeCursor(first.started_at_txt, first.id) : null;
            nextCursor = last ? encodeCursor(last.started_at_txt, last.id) : null;
        }
    }

    return { entries, prevCursor, nextCursor };
}
