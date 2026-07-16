import { error } from "@sveltejs/kit";

import { fetchEntries, hasEntries, nearestDayWithEntries, parseLimit } from "$lib/backend/time-entries.js";

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
    const limit = parseLimit(url.searchParams.get("limit"));
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";

    const { entries, prevCursor, nextCursor } = await fetchEntries({ from, to, before, after, limit, sort });

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

    let nearestNonEmptyUrl = null;
    let nearestNonEmptyLabel = null;
    if (nearestNonEmptyDate) {
        const nearestMonth = nearestNonEmptyDate.slice(0, 7);
        nearestNonEmptyUrl = `/time-entries/month/${nearestMonth}`;
        nearestNonEmptyLabel = `${formatLabel(nearestMonth)} (first month no-empty)`;
    }

    return {
        entries,
        prevCursor,
        nextCursor,
        limit,
        sort,
        mode: "month",
        currentMonth: rawMonth,
        periodLabel: formatLabel(rawMonth),
        prevPeriodUrl: `/time-entries/month/${prevMonth}`,
        prevPeriodLabel: prevLabel,
        nextPeriodUrl: `/time-entries/month/${nextMonth}`,
        nextPeriodLabel: nextLabel,
        nearestNonEmptyUrl,
        nearestNonEmptyLabel,
    };
}
