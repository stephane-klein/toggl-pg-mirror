// Activity matrix: a category × day heatmap of time-entry occurrences, served
// below the sleep activity chart on the /charts pages.
//
// Each row is a category mapped to a Toggl tag; each column a calendar day.
// A cell holds the count of entries carrying that tag that day and the summed
// duration. The server aggregates rows (get_activity_matrix_data) and this
// module shapes them into the full grid (zero cells included) consumed by
// ActivityMatrix.svelte.
//
// The category list is per-user (users.activity_matrix_categories, see
// activity-matrix-store.js): an empty list means "not configured" and the
// charts page shows a link to the profile instead of the matrix.

// Cell opacity proportional to the count, encoding intensity without a
// continuous color scale (1, 2, 3 occurrences/day would be illegible).
export function cellOpacity(count) {
    return Math.min(0.3 + count * 0.2, 1);
}

// Builds the complete grid rows = categories × days, including zero cells, so
// the template renders without any hole-filling logic. Each cell carries its
// day (used as the template key). rows is the SQL payload from
// get_activity_matrix_data: [{ day, tag, count, duration_hours }].
export function buildActivityMatrix(days, categories, rows) {
    return categories.map((category) => {
        // get_activity_matrix_data lowercases tags; compare case-insensitively so
        // a user-configured tag like "Vélo" still matches the "vélo" rows.
        const tag = category.tag.toLowerCase();
        const byDay = new Map();
        rows.forEach((row) => {
            if (row.tag === tag) {
                byDay.set(row.day, { day: row.day, count: row.count, durationHours: row.duration_hours });
            }
        });
        return {
            category,
            cells: days.map((day) => byDay.get(day) ?? { day, count: 0, durationHours: 0 }),
        };
    });
}
