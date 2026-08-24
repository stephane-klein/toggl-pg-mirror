import { sql } from "./pg.js";

// Sleep tag the activity chart filters on (time entries tagged "au lit").
export const SLEEP_TAG = "au lit";

function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + n);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}

// All calendar days in [_from, _to) as 'YYYY-MM-DD' strings, so the chart
// renders an aligned column per day (including days with no sleep).
function daysBetween(from, to) {
    const days = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
        days.push(d);
    }
    return days;
}

// Fetches and shapes the activity chart for the calendar period [_from, _to):
//   - days     : every day in the period (the X axis columns),
//   - segments : [{ day, start, end }] with start/end as real Europe/Paris
//                hours (end may exceed 24), computed by the SQL function.
// One round-trip, per ADR 002.
export async function getActivityChartData(from, to) {
    const [row] = await sql.unsafe(
        `SELECT get_activity_chart_data(
            _from => $1::date,
            _to => $2::date
        ) AS data`,
        [from, to],
    );
    return {
        days: daysBetween(from, to),
        segments: row.data,
    };
}
