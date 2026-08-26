import { error } from "@sveltejs/kit";

import { getTimeEntriesPageData, parseLimit, computeGoToData } from "$lib/server/time-entries.js";
import {
    computeTimeEntriesNav,
    hreffy,
    buildPaginationHrefs,
    parseSelectionState,
} from "$lib/shared/timeEntriesUrl.js";

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function todayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function relativeLabel(dateStr) {
    const today = todayDateStr();
    if (dateStr === today) return "Today";
    if (dateStr === addDays(today, -1)) return "Yesterday";
    if (dateStr === addDays(today, 1)) return "Tomorrow";
    return null;
}

function formatLabel(dateStr) {
    const rel = relativeLabel(dateStr);
    const [y, m, d] = dateStr.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
    const base = `${weekday}, ${dateStr}`;
    return rel ? `${rel}, ${base}` : base;
}

function formatPeriodLabel(dateStr) {
    const rel = relativeLabel(dateStr);
    const [y, m, d] = dateStr.split("-").map(Number);
    const base = new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
    return rel ? `${rel}, ${base}` : base;
}

export async function load({ params, url }) {
    const rawDate = params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        error(400, `Invalid date format: ${rawDate}`);
    }

    const from = rawDate;
    const to = addDays(rawDate, 1);
    const limit = parseLimit(url.searchParams.get("limit"), "day");
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";
    const q = url.searchParams.get("q") || "";

    const prevPeriodDate = addDays(rawDate, -1);
    const nextPeriodDate = addDays(rawDate, 1);

    const view = {
        from,
        to,
        before,
        after,
        limit,
        sort,
        q,
        prevFrom: prevPeriodDate,
        prevTo: rawDate,
        nextFrom: nextPeriodDate,
        nextTo: addDays(nextPeriodDate, 1),
    };

    const { entries, prevCursor, nextCursor, total, prevHasEntries, nextHasEntries, nearestPeriodDay, goto } =
        await getTimeEntriesPageData(view);
    const { selectedIds, selectAllMatching } = parseSelectionState(url.searchParams.get("selected"), entries);

    const prevLabel = `${formatLabel(prevPeriodDate)}${prevHasEntries ? "" : " (empty)"}`;
    const nextLabel = `${formatLabel(nextPeriodDate)}${nextHasEntries ? "" : " (empty)"}`;

    const nearestNonEmptyDate = nearestPeriodDay;

    const navData = computeTimeEntriesNav("/time-entries", url, rawDate);
    const gotoData = computeGoToData("/time-entries", url, sort, q, goto);
    const { prevPageHref, nextPageHref } = buildPaginationHrefs(url, prevCursor, nextCursor, sort);

    return {
        ...navData,
        ...gotoData,
        view,
        entries,
        selectedIds,
        selectAllMatching,
        total,
        hasFilter: !!q,
        mode: "day",
        currentDate: rawDate,
        periodLabel: formatPeriodLabel(rawDate),
        prevHref: hreffy(url, `/time-entries/day/${prevPeriodDate}`),
        prevLabel,
        nextHref: hreffy(url, `/time-entries/day/${nextPeriodDate}`),
        nextLabel,
        nearestNonEmptyHref: nearestNonEmptyDate ? hreffy(url, `/time-entries/day/${nearestNonEmptyDate}`) : null,
        nearestNonEmptyLabel: nearestNonEmptyDate ? `${formatLabel(nearestNonEmptyDate)} (first day no-empty)` : null,
        prevPageHref,
        nextPageHref,
    };
}
