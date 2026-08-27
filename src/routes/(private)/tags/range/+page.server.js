import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/shared/timeEntriesUrl.js";
import { listTagsForPeriod, nextSort, parseSort, sortHref } from "$lib/server/tags.js";

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

function isValidDate(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

export async function load({ url }) {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const navData = computeTimeEntriesNav("/tags", url, null);
    const sort = parseSort(url.searchParams.get("sort"));

    if (from && to) {
        if (!isValidDate(from)) error(400, `Invalid from date: ${from}`);
        if (!isValidDate(to)) error(400, `Invalid to date: ${to}`);
    }

    let tags = [];
    if (from && to) {
        tags = await listTagsForPeriod(from, addDays(to, 1), `${sort.column}_${sort.dir}`);
    }

    return {
        ...navData,
        mode: "range",
        currentFrom: from || "",
        currentTo: to || "",
        periodLabel: from && to ? `${from} – ${to}` : "",
        tags,
        sort,
        nameHref: sortHref(url, nextSort("name", sort)),
        countHref: sortHref(url, nextSort("count", sort)),
        durationHref: sortHref(url, nextSort("duration", sort)),
    };
}
