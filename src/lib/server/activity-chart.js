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

// Fetches and shapes the full /charts page payload for the calendar period
// [_from, _to) in a single round-trip (ADR 002):
//   - days       : every day in the period (the X axis columns),
//   - categories : the user's activity matrix category list, read from the
//                  users table by the SQL function (empty when not configured),
//   - segments   : [{ day, start, end }] sleep spans with start/end as real
//                  Europe/Paris hours (end may exceed 24), computed by SQL,
//   - matrixRows : [{ day, tag, count, duration_hours }] activity matrix
//                  aggregates, fed to buildActivityMatrix for the full grid.
//   - timelinePeriods : [{ id, category, title, start_date, end_date, ongoing }]
//                  period-type timeline events intersecting the window, fed to
//                  the Gantt swimlane chart (clipped client-side).
// The categories are returned (not passed in) so the load layer never issues a
// separate users lookup: one round-trip serves the whole render (ADR 002).
export async function getChartsPageData(from, to, userId) {
    const [row] = await sql.unsafe(
        `SELECT get_charts_page_data(
            _from => $1::date,
            _to => $2::date,
            _user_id => $3::text
        ) AS data`,
        [from, to, userId],
        // Custom plan: the matrix aggregation cost and join strategy depend on
        // the tag list and the period width (see ADR 002 / prepare: false).
        { prepare: false },
    );
    return {
        days: daysBetween(from, to),
        categories: row.data.categories,
        segments: row.data.segments,
        matrixRows: row.data.matrix,
        timelinePeriods: row.data.timeline_periods,
    };
}
