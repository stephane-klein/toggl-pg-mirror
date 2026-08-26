import { sql } from "./pg.js";
import { error } from "@sveltejs/kit";
import { modifyCurrentUrl } from "$lib/url";
import { splitFilter, TagFilterError } from "../shared/tagFilter.js";

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

function getMonday(year, week) {
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - (dow - 1));
    const monday = new Date(week1Monday);
    monday.setDate(week1Monday.getDate() + (week - 1) * 7);
    return monday;
}

function firstOfMonth(year, month) {
    const d = new Date(year, month - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
}

function computeGotoBounds(now) {
    const today = now.toISOString().split("T")[0];
    const nextDay = addDays(today, 1);
    const { year: thisYear, week: thisWeek } = getISOWeek(now);
    const thisMonth = today.slice(0, 7);
    const weekMonday = getMonday(thisYear, thisWeek);
    const weekTo = addDays(weekMonday.toISOString().split("T")[0], 7);
    const monthFirst = firstOfMonth(thisYear, thisMonth.split("-")[1]);
    const monthTo = firstOfMonth(Number(thisMonth.split("-")[0]), Number(thisMonth.split("-")[1]) + 1);
    return {
        todayFrom: today,
        todayTo: nextDay,
        weekFrom: weekMonday.toISOString().split("T")[0],
        weekTo,
        monthFrom: monthFirst,
        monthTo,
    };
}

export async function getTimeEntriesPageData({
    from,
    to,
    before,
    after,
    limit,
    sort = "asc",
    q = "",
    prevFrom,
    prevTo,
    nextFrom,
    nextTo,
}) {
    const cursor = before ? decodeCursor(before) : after ? decodeCursor(after) : null;
    const asc = cursor && before ? false : cursor && after ? true : sort === "asc";
    const gotoBounds = computeGotoBounds(new Date());

    let description;
    let tags;
    try {
        ({ description, tags } = splitFilter(q));
    } catch (e) {
        if (e instanceof TagFilterError) error(400, e.message);
        throw e;
    }

    const [row] = await sql.unsafe(
        `SELECT get_time_entries_page_data(
            _from => $1::date,
            _to => $2::date,
            _q => $3::text,
            _limit => $4::int,
            _asc => $5::boolean,
            _before_started_at => $6::timestamptz,
            _before_id => $7::bigint,
            _after_started_at => $8::timestamptz,
            _after_id => $9::bigint,
            _prev_from => $10::date,
            _prev_to => $11::date,
            _next_from => $12::date,
            _next_to => $13::date,
            _goto_today_from => $14::date,
            _goto_today_to => $15::date,
            _goto_week_from => $16::date,
            _goto_week_to => $17::date,
            _goto_month_from => $18::date,
            _goto_month_to => $19::date,
            _tags => $20::jsonb
        ) AS data`,
        [
            from,
            to,
            description,
            limit,
            asc,
            cursor && before ? cursor.startedAt : null,
            cursor && before ? cursor.id : null,
            cursor && after ? cursor.startedAt : null,
            cursor && after ? cursor.id : null,
            prevFrom,
            prevTo,
            nextFrom,
            nextTo,
            gotoBounds.todayFrom,
            gotoBounds.todayTo,
            gotoBounds.weekFrom,
            gotoBounds.weekTo,
            gotoBounds.monthFrom,
            gotoBounds.monthTo,
            tags,
        ],
        // prepare: false keeps this an unnamed statement, which PostgreSQL always
        // plans custom: the real parameter values (_asc, dates, _limit, _q) are
        // folded at plan time. The page CTE relies on this to prune the inactive
        // UNION ALL branch and to choose index-only / index-ordered plans.
        { prepare: false },
    );

    const data = row.data;
    const rows = data.entries;
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    if (before && cursor) rows.reverse();
    if (after && cursor && sort !== "asc") rows.reverse();

    const entries = rows;

    const first = entries.length > 0 ? entries[0] : null;
    const last = entries.length > 0 ? entries[entries.length - 1] : null;

    let prevCursor = null;
    let nextCursor = null;

    if (sort === "asc") {
        if (!before && !after) {
            prevCursor = null;
            nextCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
        } else if (before) {
            prevCursor = first ? encodeCursor(first.started_at_txt, first.id) : null;
            nextCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
        } else if (after) {
            prevCursor = first ? encodeCursor(first.started_at_txt, first.id) : null;
            nextCursor = hasMore && last ? encodeCursor(last.started_at_txt, last.id) : null;
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

    return {
        entries,
        prevCursor,
        nextCursor,
        total: Number(data.total),
        prevHasEntries: data.prev_period_has_entries,
        nextHasEntries: data.next_period_has_entries,
        nearestPeriodDay: data.nearest_period_day,
        goto: {
            todayHasEntries: data.goto.today_has_entries,
            nearestTodayDay: data.goto.nearest_today_day,
            weekHasEntries: data.goto.week_has_entries,
            nearestWeekDay: data.goto.nearest_week_day,
            monthHasEntries: data.goto.month_has_entries,
            nearestMonthDay: data.goto.nearest_month_day,
        },
    };
}

// Returns every time entry matching the current view filter (same predicate as
// the 'total' count in getTimeEntriesPageData), unpaginated. Serves the
// 'select all matching' selection: the bulk edit derives the ids from it and
// the copy/export reads the full rows.
export async function getMatchingTimeEntries({ from, to, q = "" }) {
    let description;
    let tags;
    try {
        ({ description, tags } = splitFilter(q));
    } catch (e) {
        if (e instanceof TagFilterError) error(400, e.message);
        throw e;
    }

    const [row] = await sql.unsafe(
        `SELECT get_matching_time_entries(
            _from => $1::date,
            _to => $2::date,
            _q => $3::text,
            _tags => $4::jsonb
        ) AS data`,
        [from, to, description, tags],
        { prepare: false },
    );
    return row.data;
}

export function computeGoToData(basePath, url, sort, q, goto) {
    const limitRaw = url.searchParams.get("limit");

    function hreffy(path) {
        const params = {
            sort,
            q,
            from: null,
            to: null,
            year: null,
            week: null,
            month: null,
            date: null,
            before: null,
            after: null,
            selected: null,
        };
        if (limitRaw !== null) params.limit = limitRaw;
        return modifyCurrentUrl(url, path, params);
    }

    let firstNonEmptyDayUrl = null;
    let firstNonEmptyDayLabel = null;
    if (!goto.todayHasEntries && goto.nearestTodayDay) {
        firstNonEmptyDayUrl = `${basePath}/day/${goto.nearestTodayDay}`;
        firstNonEmptyDayLabel = `${goto.nearestTodayDay} (no-empty)`;
    }

    let firstNonEmptyWeekUrl = null;
    let firstNonEmptyWeekLabel = null;
    if (!goto.weekHasEntries && goto.nearestWeekDay) {
        const { year: ny, week: nw } = getISOWeek(new Date(goto.nearestWeekDay));
        firstNonEmptyWeekUrl = `${basePath}/week/${ny}/${nw}`;
        firstNonEmptyWeekLabel = `W ${nw} (no-empty)`;
    }

    let firstNonEmptyMonthUrl = null;
    let firstNonEmptyMonthLabel = null;
    if (!goto.monthHasEntries && goto.nearestMonthDay) {
        const nm = goto.nearestMonthDay.slice(0, 7);
        firstNonEmptyMonthUrl = `${basePath}/month/${nm}`;
        firstNonEmptyMonthLabel = `${nm} (no-empty)`;
    }

    return {
        todayHasEntries: goto.todayHasEntries,
        firstNonEmptyDayHref: firstNonEmptyDayUrl ? hreffy(firstNonEmptyDayUrl) : null,
        firstNonEmptyDayLabel,
        thisWeekHasEntries: goto.weekHasEntries,
        firstNonEmptyWeekHref: firstNonEmptyWeekUrl ? hreffy(firstNonEmptyWeekUrl) : null,
        firstNonEmptyWeekLabel,
        thisMonthHasEntries: goto.monthHasEntries,
        firstNonEmptyMonthHref: firstNonEmptyMonthUrl ? hreffy(firstNonEmptyMonthUrl) : null,
        firstNonEmptyMonthLabel,
    };
}
