import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/backend/timeEntriesUrl.js";

function isValidDate(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

export function load({ url }) {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const navData = computeTimeEntriesNav("/charts", url, null);

    if (from && to) {
        if (!isValidDate(from)) error(400, `Invalid from date: ${from}`);
        if (!isValidDate(to)) error(400, `Invalid to date: ${to}`);
    }

    return {
        ...navData,
        mode: "range",
        currentFrom: from || "",
        currentTo: to || "",
        periodLabel: from && to ? `${from} – ${to}` : "",
    };
}
