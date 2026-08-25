// Activity matrix: a category × day heatmap of time-entry occurrences, served
// below the sleep activity chart on the /charts pages.
//
// Each row is a category mapped to a Toggl tag; each column a calendar day.
// A cell holds the count of entries carrying that tag that day and the summed
// duration. The server aggregates rows (get_activity_matrix_data) and this
// module shapes them into the full grid (zero cells included) consumed by
// ActivityMatrix.svelte.

// Fixed category order — the significant display order, not alphabetical.
export const ACTIVITY_MATRIX_CATEGORIES = [
    { key: "restaurant", label: "Restaurant", tag: "restaurant", color: "#D62828" },
    { key: "sport", label: "Sport", tag: "sport", color: "#2A9D8F" },
    { key: "fastfood", label: "Fastfood", tag: "fastfood", color: "#F77F00" },
    { key: "courses", label: "Courses", tag: "courses", color: "#8338EC" },
    { key: "metro", label: "Métro", tag: "metro", color: "#2196F3" },
    { key: "velo", label: "Vélo", tag: "vélo", color: "#4CAF50" },
];

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
        const byDay = new Map();
        rows.forEach((row) => {
            if (row.tag === category.tag) {
                byDay.set(row.day, { day: row.day, count: row.count, durationHours: row.duration_hours });
            }
        });
        return {
            category,
            cells: days.map((day) => byDay.get(day) ?? { day, count: 0, durationHours: 0 }),
        };
    });
}
