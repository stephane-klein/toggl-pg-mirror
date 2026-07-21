import { error } from "@sveltejs/kit";

import { fetchEntries, countEntries, parseLimit, computeGoToData } from "$lib/backend/time-entries.js";

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

    const gotoData = await computeGoToData();

    const q = url.searchParams.get("q") || "";

    if (!from || !to) {
        return {
            ...gotoData,
            entries: [],
            prevCursor: null,
            nextCursor: null,
            limit: parseLimit(url.searchParams.get("limit"), "range"),
            q,
            total: 0,
            mode: "range",
            currentFrom: from || "",
            currentTo: to || "",
            periodLabel: "",
        };
    }

    if (!isValidDate(from)) error(400, `Invalid from date: ${from}`);
    if (!isValidDate(to)) error(400, `Invalid to date: ${to}`);

    const toExclusive = addDays(to, 1);
    const limit = parseLimit(url.searchParams.get("limit"), "range");
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");
    const sort = url.searchParams.get("sort") || "asc";

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

    return {
        ...gotoData,
        entries,
        prevCursor,
        nextCursor,
        limit,
        sort,
        q,
        total,
        mode: "range",
        currentFrom: from,
        currentTo: to,
        periodLabel: `${from} – ${to}`,
    };
}
