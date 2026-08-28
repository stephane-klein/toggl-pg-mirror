import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/shared/timeEntriesUrl.js";
import { listTagsForPeriod, nextSort, parseSort, sortHref } from "$lib/server/tags.js";

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

    const prevMonth = addMonths(rawMonth, -1);
    const nextMonth = addMonths(rawMonth, 1);

    const navData = computeTimeEntriesNav("/tags", url, firstOfMonth(year, monthNum));
    const sort = parseSort(url.searchParams.get("sort"));
    const q = url.searchParams.get("q") || "";
    const tags = await listTagsForPeriod(
        firstOfMonth(year, monthNum),
        firstOfMonth(year, monthNum + 1),
        `${sort.column}_${sort.dir}`,
        q,
    );

    return {
        ...navData,
        mode: "month",
        currentMonth: rawMonth,
        periodLabel: formatLabel(rawMonth),
        prevHref: sortHref(url, `${sort.column}_${sort.dir}`, `/tags/month/${prevMonth}`),
        prevLabel: formatLabel(prevMonth),
        nextHref: sortHref(url, `${sort.column}_${sort.dir}`, `/tags/month/${nextMonth}`),
        nextLabel: formatLabel(nextMonth),
        tags,
        sort,
        nameHref: sortHref(url, nextSort("name", sort)),
        countHref: sortHref(url, nextSort("count", sort)),
        durationHref: sortHref(url, nextSort("duration", sort)),
    };
}
