import { error } from "@sveltejs/kit";

import {
    fetchEntries,
    countEntries,
    hasEntries,
    nearestDayWithEntries,
    parseLimit,
    computeGoToData,
} from "$lib/backend/time-entries.js";
import { computeTimeEntriesNav, hreffy, buildPaginationHrefs } from "$lib/backend/timeEntriesUrl.js";

function firstOfMonth(year, month) {
    const d = new Date(year, month - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
}

function formatLabel(monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function addMonths(monthStr, n) {
    const [y, m] = monthStr.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yy}-${mm}`;
}

export async function load({ params, url }) {
    const rawMonth = params.month;
    if (!/^\d{4}-\d{2}$/.test(rawMonth)) {
        error(400, `Invalid month format: ${rawMonth}`);
    }

    const [year, monthNum] = rawMonth.split("-").map(Number);
    if (monthNum < 1 || monthNum > 12) {
        error(400, `Invalid month: ${rawMonth}`);
    }

    const from = firstOfMonth(year, monthNum);
    const to = firstOfMonth(year, monthNum + 1);
    const limit = parseLimit(url.searchParams.get("limit"), "month");
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";
    const q = url.searchParams.get("q") || "";

    const [{ entries, prevCursor, nextCursor }, total] = await Promise.all([
        fetchEntries({ from, to, before, after, limit, sort, q }),
        countEntries({ from, to, q }),
    ]);

    const prevMonth = addMonths(rawMonth, -1);
    const nextMonth = addMonths(rawMonth, 1);

    const [prevMonthY, prevMonthM] = prevMonth.split("-").map(Number);
    const [nextMonthY, nextMonthM] = nextMonth.split("-").map(Number);

    const [prevHasEntries, nextHasEntries] = await Promise.all([
        hasEntries(firstOfMonth(prevMonthY, prevMonthM), firstOfMonth(prevMonthY, prevMonthM + 1)),
        hasEntries(firstOfMonth(nextMonthY, nextMonthM), firstOfMonth(nextMonthY, nextMonthM + 1)),
    ]);

    const prevLabel = `${formatLabel(prevMonth)}${prevHasEntries ? "" : " (empty)"}`;
    const nextLabel = `${formatLabel(nextMonth)}${nextHasEntries ? "" : " (empty)"}`;

    let nearestNonEmptyDate = null;
    if (!prevHasEntries && !nextHasEntries) {
        nearestNonEmptyDate = await nearestDayWithEntries(firstOfMonth(year, monthNum));
    }

    let nearestNonEmptyHref = null;
    let nearestNonEmptyLabel = null;
    if (nearestNonEmptyDate) {
        const nearestMonth = nearestNonEmptyDate.slice(0, 7);
        nearestNonEmptyHref = hreffy(url, `/time-entries/month/${nearestMonth}`);
        nearestNonEmptyLabel = `${formatLabel(nearestMonth)} (first month no-empty)`;
    }

    const navData = computeTimeEntriesNav(url, rawMonth + "-01");
    const gotoData = await computeGoToData(url, sort, q);
    const { prevPageHref, nextPageHref } = buildPaginationHrefs(url, prevCursor, nextCursor, sort);

    return {
        ...navData,
        ...gotoData,
        entries,
        total,
        mode: "month",
        currentMonth: rawMonth,
        periodLabel: formatLabel(rawMonth),
        prevHref: hreffy(url, `/time-entries/month/${prevMonth}`),
        prevLabel,
        nextHref: hreffy(url, `/time-entries/month/${nextMonth}`),
        nextLabel,
        nearestNonEmptyHref,
        nearestNonEmptyLabel,
        prevPageHref,
        nextPageHref,
    };
}
