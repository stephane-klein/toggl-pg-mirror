import { error } from "@sveltejs/kit";

import { fetchEntries, countEntries, parseLimit, computeGoToData } from "$lib/backend/time-entries.js";
import { computeTimeEntriesNav, buildPaginationHrefs } from "$lib/backend/timeEntriesUrl.js";

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
    const sort = url.searchParams.get("sort") || "asc";
    const q = url.searchParams.get("q") || "";

    const navData = computeTimeEntriesNav(url);
    const gotoData = await computeGoToData(url, sort, q);

    if (!from || !to) {
        return {
            ...navData,
            ...gotoData,
            entries: [],
            total: 0,
            mode: "range",
            currentFrom: from || "",
            currentTo: to || "",
            periodLabel: "",
            prevPageHref: null,
            nextPageHref: null,
        };
    }

    if (!isValidDate(from)) error(400, `Invalid from date: ${from}`);
    if (!isValidDate(to)) error(400, `Invalid to date: ${to}`);

    const toExclusive = addDays(to, 1);
    const limit = parseLimit(url.searchParams.get("limit"), "range");
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");

    const [{ entries, prevCursor, nextCursor }, total] = await Promise.all([
        fetchEntries({
            from,
            to: toExclusive,
            before,
            after,
            limit,
            sort,
            q,
        }),
        countEntries({ from, to: toExclusive, q }),
    ]);

    const { prevPageHref, nextPageHref } = buildPaginationHrefs(url, prevCursor, nextCursor, sort);

    return {
        ...navData,
        ...gotoData,
        entries,
        total,
        mode: "range",
        currentFrom: from,
        currentTo: to,
        periodLabel: `${from} – ${to}`,
        prevPageHref,
        nextPageHref,
    };
}
