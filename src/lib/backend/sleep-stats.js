// Pure statistics for the sleep chart. Input is the raw segments from
// get_activity_chart_data (real Europe/Paris hours, end may exceed 24). Only
// the longest sleep segment of each day ("main night") is kept so naps never
// skew the stats. All measures are computed on the raw hours: every start
// falls inside the same [04:00, 04:00) day bucket, i.e. the linear interval
// [4, 28), so the midnight wrap never pollutes the result — the `% 24` is
// applied only when displaying.

function mean(values) {
    return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Sample standard deviation (÷ n-1), so a week of nights reports how spread
// out the values are around the median.
function stddev(values) {
    const m = mean(values);
    const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
}

// Linear-interpolation percentile (type 7, the default in most statistics
// software), consistent with how the median is defined.
function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function statsFor(values) {
    return {
        mean: mean(values),
        median: median(values),
        stddev: stddev(values),
        p25: percentile(values, 0.25),
        p75: percentile(values, 0.75),
        min: Math.min(...values),
        max: Math.max(...values),
    };
}

export function computeSleepStats(segments) {
    const nights = Object.values(
        segments.reduce((acc, seg) => {
            const dur = seg.end - seg.start;
            const prev = acc[seg.day];
            if (!prev || dur > prev.dur) acc[seg.day] = { start: seg.start, end: seg.end, dur };
            return acc;
        }, {}),
    );

    if (nights.length < 2) return null;

    const bedtimes = nights.map((n) => n.start);
    const wakes = nights.map((n) => n.end);
    const durations = nights.map((n) => n.dur);

    return {
        n: nights.length,
        bedtime: statsFor(bedtimes),
        wake: statsFor(wakes),
        duration: statsFor(durations),
    };
}
