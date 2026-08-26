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

export async function load({ params, url, locals }) {
    const rawDate = params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        error(400, `Invalid date format: ${rawDate}`);
    }

    const navData = computeTimeEntriesNav("/charts", url, rawDate);
    const prevPeriodDate = addDays(rawDate, -1);
    const nextPeriodDate = addDays(rawDate, 1);
    const { days, categories, segments, matrixRows } = await getChartsPageData(
        rawDate,
        addDays(rawDate, 1),
        locals.user.id,
    );
    const matrix = buildActivityMatrix(days, categories, matrixRows);

    return {
        ...navData,
        mode: "day",
        currentDate: rawDate,
        periodLabel: formatPeriodLabel(rawDate),
        prevHref: `/charts/day/${prevPeriodDate}`,
        prevLabel: formatLabel(prevPeriodDate),
        nextHref: `/charts/day/${nextPeriodDate}`,
        nextLabel: formatLabel(nextPeriodDate),
        days,
        segments,
        matrix,
    };
}
