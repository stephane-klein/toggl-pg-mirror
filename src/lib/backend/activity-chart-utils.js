// Pure rendering helpers for the activity chart. The server computes each
// segment's { day, start, end } in real (Europe/Paris) hours — end can exceed
// 24 for a wake-up after midnight. These functions map those hours onto the
// chart's day-offset axis (a "day" runs 04:00 → 04:00) and split the resulting
// bar when it wraps across the top of the chart (a night spanning midnight).

export const DAY_START_HOUR = 4;

// Real hour → position on the day-offset axis [0, 24), where 0 is 04:00.
// 04:00 real → 0 (top of the chart), 03:59 real → ~23.98 (bottom).
export function toDayOffset(hour) {
    return (hour - DAY_START_HOUR + 24) % 24;
}

// A segment { start, end } (real hours, end may exceed 24) renders as one or
// two bars within a single day column, depending on whether the sleep wraps
// across the 04:00 boundary at the top of the chart. Returns a list of
// { y0, y1 } offsets (ascending) ready to feed the scaleLinear.
export function splitSegments(segment) {
    const y0 = toDayOffset(segment.start);
    const y1 = toDayOffset(segment.end);
    if (y1 >= y0) return [{ y0, y1 }];
    return [
        { y0, y1: 24 },
        { y0: 0, y1 },
    ];
}

// 23.5 → "23h30"
export function fmtTime(hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const mStr = String(m).padStart(2, "0");
    const label = `${String(h).padStart(2, "0")}h${mStr}`;
    return label;
}

// 7.5 → "7h30"
export function fmtDuration(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const mStr = String(m).padStart(2, "0");
    return `${h}h${mStr}`;
}
