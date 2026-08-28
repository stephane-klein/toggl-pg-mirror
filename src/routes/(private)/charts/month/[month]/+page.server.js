import { error } from "@sveltejs/kit";

import { computeTimeEntriesNav } from "$lib/shared/timeEntriesUrl.js";
import { getChartsPageData } from "$lib/server/activity-chart.js";
import { buildActivityMatrix } from "$lib/shared/activity-matrix.js";

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

export async function load({ params, url, locals }) {
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

    const navData = computeTimeEntriesNav("/charts", url, firstOfMonth(year, monthNum));
    const { days, categories, segments, matrixRows, timelinePeriods } = await getChartsPageData(
        firstOfMonth(year, monthNum),
        firstOfMonth(year, monthNum + 1),
        locals.user.id,
    );
    const matrix = buildActivityMatrix(days, categories, matrixRows);

    return {
        ...navData,
        mode: "month",
        currentMonth: rawMonth,
        periodLabel: formatLabel(rawMonth),
        prevHref: `/charts/month/${prevMonth}`,
        prevLabel: formatLabel(prevMonth),
        nextHref: `/charts/month/${nextMonth}`,
        nextLabel: formatLabel(nextMonth),
        days,
        segments,
        matrix,
        timelinePeriods,
    };
}
