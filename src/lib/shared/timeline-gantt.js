// Pure helpers for the timeline Gantt chart (per-category swimlanes on the
// /charts page). Given the period-type timeline events and the visible window
// [from, to), they compute the clipped bars, the lane stacking within each
// category (no overlap, newest below oldest) and the per-category color.
//
// All dates are 'YYYY-MM-DD' strings; an interval renders as [start, end)
// (end exclusive, matching the app-wide _to convention).

export const UNCATEGORIZED_LABEL = "Uncategorized";
export const UNCATEGORIZED_COLOR = "#9E9E9E";

// Distinct hues assigned to free-text categories by deterministic hash so the
// same category always gets the same color. Cycled when more than 10 exist.
export const PERIOD_COLORS = [
    "#2A9D8F",
    "#D62828",
    "#F77F00",
    "#8338EC",
    "#2196F3",
    "#4CAF50",
    "#E91E63",
    "#FFC107",
    "#00BCD4",
    "#795548",
];

// djb2-style stable hash → palette color. Uncategorized is a fixed gray.
export function categoryColor(name) {
    if (name === UNCATEGORIZED_LABEL) return UNCATEGORIZED_COLOR;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return PERIOD_COLORS[hash % PERIOD_COLORS.length];
}

function categoryLabel(period) {
    return period.category === null ? UNCATEGORIZED_LABEL : period.category;
}

// Clips each period to the window [from, to) (ongoing periods extend to _to),
// drops the empty ones and sorts by (start_date, id) ascending so a greedy
// lane pass naturally pushes a newer overlapping period below the older one.
function clipAndSort(periods, from, to) {
    return periods
        .filter((p) => p.start_date < to && (p.end_date === null || p.end_date > from))
        .map((p) => {
            const start = p.start_date > from ? p.start_date : from;
            const end = p.end_date === null || p.end_date > to ? to : p.end_date;
            return { ...p, start, end };
        })
        .filter((p) => p.end > p.start)
        .sort((a, b) => (a.start_date === b.start_date ? a.id - b.id : a.start_date < b.start_date ? -1 : 1));
}

// First-fit lane assignment: each period joins the first lane whose last bar
// ends before (or exactly at) its start, so adjacent periods stay on one lane
// while genuinely overlapping ones stack (newest below oldest).
function assignLanes(items) {
    return items.reduce((lanes, period) => {
        const lane = lanes.find((l) => l[l.length - 1].end <= period.start);
        if (lane) {
            lane.push(period);
        } else {
            lanes.push([period]);
        }
        return lanes;
    }, []);
}

function groupByCategory(items) {
    const groups = new Map();
    items.forEach((period) => {
        const category = categoryLabel(period);
        const group = groups.get(category) ?? [];
        group.push(period);
        groups.set(category, group);
    });
    // Map preserves insertion order: with items already sorted by start date,
    // the categories come out ordered by first chronological appearance.
    return [...groups].map(([category, items]) => ({ category, items }));
}

// Returns [{ category, color, lanes: [[period, ...], ...] }], lanes ordered
// top-down. Each period carries the clipped { start, end } plus its original
// fields (id, category, title, ongoing).
export function buildTimelineGantt(periods, from, to) {
    return groupByCategory(clipAndSort(periods, from, to)).map(({ category, items }) => ({
        category,
        color: categoryColor(category),
        lanes: assignLanes(items),
    }));
}
