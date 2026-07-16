import { error } from "@sveltejs/kit";

import { fetchEntries, hasEntries, nearestDayWithEntries, parseLimit } from "$lib/backend/time-entries.js";

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function formatLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
    return `${weekday}, ${dateStr}`;
}

function formatPeriodLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export async function load({ params, url }) {
    const rawDate = params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        error(400, `Invalid date format: ${rawDate}`);
    }

    const from = rawDate;
    const to = addDays(rawDate, 1);
    const limit = parseLimit(url.searchParams.get("limit"));
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";

    const { entries, prevCursor, nextCursor } = await fetchEntries({ from, to, before, after, limit, sort });

    const prevPeriodDate = addDays(rawDate, -1);
    const nextPeriodDate = addDays(rawDate, 1);

    const [prevHasEntries, nextHasEntries] = await Promise.all([
        hasEntries(prevPeriodDate, rawDate),
        hasEntries(nextPeriodDate, addDays(nextPeriodDate, 1)),
    ]);

    const prevLabel = `${formatLabel(prevPeriodDate)}${prevHasEntries ? "" : " (empty)"}`;
    const nextLabel = `${formatLabel(nextPeriodDate)}${nextHasEntries ? "" : " (empty)"}`;

    let nearestNonEmptyDate = null;
    if (!prevHasEntries && !nextHasEntries) {
        nearestNonEmptyDate = await nearestDayWithEntries(rawDate);
    }

    return {
        entries,
        prevCursor,
        nextCursor,
        limit,
        sort,
        mode: "day",
        currentDate: rawDate,
        periodLabel: formatPeriodLabel(rawDate),
        prevPeriodUrl: `/time-entries/day/${prevPeriodDate}`,
        prevPeriodLabel: prevLabel,
        nextPeriodUrl: `/time-entries/day/${nextPeriodDate}`,
        nextPeriodLabel: nextLabel,
        nearestNonEmptyUrl: nearestNonEmptyDate ? `/time-entries/day/${nearestNonEmptyDate}` : null,
        nearestNonEmptyLabel: nearestNonEmptyDate ? `${formatLabel(nearestNonEmptyDate)} (first day no-empty)` : null,
    };
}
