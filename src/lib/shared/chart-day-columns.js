// Single source of truth for the day-column geometry shared by the /charts
// page charts (TimelineGantt, ActivityMatrix, ActivityChart). All three must
// render their days on the exact same x positions, so the constants and the
// width formula live here and are never reimplemented per component.

export const DAY_CHART_LEFT_GUTTER = 96; // mirrors the matrix category labels
export const DAY_CHART_RIGHT_MARGIN = 8;
export const MIN_DAY_CELL_WIDTH = 24;
export const DAY_SCALE_PADDING = 0.12;

// Returns the per-day cell width and the total plot width for `dayCount` days
// inside a container of `containerWidth` px (null during SSR: fall back to the
// minimum so first paint is already aligned). Identical inputs always yield
// identical outputs, so the three charts can never drift apart.
export function computeDayColumns(containerWidth, dayCount) {
    if (containerWidth === null) {
        return { cellWidth: MIN_DAY_CELL_WIDTH, plotWidth: dayCount * MIN_DAY_CELL_WIDTH };
    }
    const usable = containerWidth - DAY_CHART_LEFT_GUTTER - DAY_CHART_RIGHT_MARGIN;
    const cellWidth = Math.max(MIN_DAY_CELL_WIDTH, Math.floor(usable / Math.max(1, dayCount)));
    return { cellWidth, plotWidth: dayCount * cellWidth };
}
