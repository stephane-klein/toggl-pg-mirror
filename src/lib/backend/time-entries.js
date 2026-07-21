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

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function getISOWeek(d) {
    const isoDow = ((d.getDay() + 6) % 7) + 1;
    const thursday = new Date(d);
    thursday.setDate(d.getDate() - isoDow + 4);
    const year = thursday.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = (thursday - jan1) / 86400000;
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return { year, week };
}

export async function computeGoToData() {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const nextDay = addDays(today, 1);

    const { year: thisYear, week: thisWeek } = getISOWeek(now);
    const thisMonth = today.slice(0, 7);

    const getMonday = (year, week) => {
        const jan4 = new Date(year, 0, 4);
        const dow = jan4.getDay() || 7;
        const week1Monday = new Date(jan4);
        week1Monday.setDate(jan4.getDate() - (dow - 1));
        const monday = new Date(week1Monday);
        monday.setDate(week1Monday.getDate() + (week - 1) * 7);
        return monday;
    };

    const weekMonday = getMonday(thisYear, thisWeek);
    const weekTo = addDays(weekMonday.toISOString().split("T")[0], 7);

    const monthFirst = firstOfMonth(thisYear, thisMonth.split("-")[1]);
    const monthTo = firstOfMonth(Number(thisMonth.split("-")[0]), Number(thisMonth.split("-")[1]) + 1);

    const [todayHas, weekHas, monthHas] = await Promise.all([
        hasEntries(today, nextDay),
        hasEntries(weekMonday.toISOString().split("T")[0], weekTo),
        hasEntries(monthFirst, monthTo),
    ]);

    let firstNonEmptyDayUrl = null;
    let firstNonEmptyDayLabel = null;
    let firstNonEmptyWeekUrl = null;
    let firstNonEmptyWeekLabel = null;
    let firstNonEmptyMonthUrl = null;
    let firstNonEmptyMonthLabel = null;

    if (!todayHas) {
        const nearest = await nearestDayWithEntries(today);
        if (nearest) {
            firstNonEmptyDayUrl = `/time-entries/day/${nearest}`;
            firstNonEmptyDayLabel = nearest;
        }
    }

    if (!weekHas) {
        const nearest = await nearestDayWithEntries(weekMonday.toISOString().split("T")[0]);
        if (nearest) {
            const { year: ny, week: nw } = getISOWeek(new Date(nearest));
            firstNonEmptyWeekUrl = `/time-entries/week/${ny}/${nw}`;
            firstNonEmptyWeekLabel = `W ${nw}`;
        }
    }

    if (!monthHas) {
        const nearest = await nearestDayWithEntries(monthFirst);
        if (nearest) {
            const nm = nearest.slice(0, 7);
            firstNonEmptyMonthUrl = `/time-entries/month/${nm}`;
            firstNonEmptyMonthLabel = nm;
        }
    }

    return {
        todayHasEntries: todayHas,
        firstNonEmptyDayUrl,
        firstNonEmptyDayLabel,
        thisWeekHasEntries: weekHas,
        firstNonEmptyWeekUrl,
        firstNonEmptyWeekLabel,
        thisMonthHasEntries: monthHas,
        firstNonEmptyMonthUrl,
        firstNonEmptyMonthLabel,
    };
}

function firstOfMonth(year, month) {
    const d = new Date(year, month - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
}

function buildDescriptionFilter(q) {
    if (!q) {
        return sql``;
    }
    if (q === "/null") {
        return sql`AND description IS NULL`;
    }
    const quoted = q.startsWith('"') && q.endsWith('"');
    if (quoted) {
        const phrase = q.slice(1, -1);
        if (!phrase) return sql``;
        return sql`AND immutable_unaccent(description) ILIKE immutable_unaccent(${phrase})`;
    }
    const words = q.split(" ").filter(Boolean);
    if (words.length === 0) {
        return sql``;
    }
    const conditions = words.map(
        (w) => sql`immutable_unaccent(description) ILIKE immutable_unaccent(${"%" + w + "%"})`,
    );
    let combined = conditions[0];
    for (let i = 1; i < conditions.length; i++) {
        combined = sql`${combined} AND ${conditions[i]}`;
    }
    return sql`AND ${combined}`;
}

export async function fetchEntries({ from, to, before, after, limit, sort = "asc", q = "" }) {
    const cursor = before ? decodeCursor(before) : after ? decodeCursor(after) : null;
    const isAsc = sort === "asc";
    const descFilter = buildDescriptionFilter(q);

    let rows;
    if (before && cursor) {
        rows = await sql`
            SELECT id, description, tags, started_at, ended_at,
                   started_at::text AS started_at_txt
            FROM time_entries
            WHERE deleted_at IS NULL
              ${descFilter}
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
              ${descFilter}
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
              ${descFilter}
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

export async function countEntries({ from, to, q = "" }) {
    const descFilter = buildDescriptionFilter(q);
    const [row] = await sql`
        SELECT count(*) AS total
        FROM time_entries
        WHERE deleted_at IS NULL
          ${descFilter}
          AND started_at >= ${from}::timestamptz
          AND started_at <  ${to}::timestamptz
    `;
    return Number(row.total);
}
