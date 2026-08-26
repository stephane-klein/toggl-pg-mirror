import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/shared/timeEntriesUrl.js";
import { getChartsPageData } from "$lib/server/activity-chart.js";
import { buildActivityMatrix } from "$lib/shared/activity-matrix.js";

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

export async function load({ url, locals }) {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const navData = computeTimeEntriesNav("/charts", url, null);

    if (from && to) {
        if (!isValidDate(from)) error(400, `Invalid from date: ${from}`);
        if (!isValidDate(to)) error(400, `Invalid to date: ${to}`);
    }

    let days = [];
    let segments = [];
    let matrix = [];
    if (from && to) {
        const {
            days: ds,
            categories,
            segments: ss,
            matrixRows,
        } = await getChartsPageData(from, addDays(to, 1), locals.user.id);
        days = ds;
        segments = ss;
        matrix = buildActivityMatrix(days, categories, matrixRows);
    }

    return {
        ...navData,
        mode: "range",
        currentFrom: from || "",
        currentTo: to || "",
        periodLabel: from && to ? `${from} – ${to}` : "",
        days,
        segments,
        matrix,
    };
}
