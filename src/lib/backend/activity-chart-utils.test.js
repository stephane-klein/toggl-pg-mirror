import { test } from "node:test";
import assert from "node:assert/strict";

import { toDayOffset, splitSegments, fmtTime, fmtDuration } from "./activity-chart-utils.js";

test("toDayOffset maps real hours onto the 04:00 → 04:00 day axis", () => {
    assert.equal(toDayOffset(4), 0);
    assert.equal(toDayOffset(12), 8);
    assert.equal(toDayOffset(23.5), 19.5);
    assert.equal(toDayOffset(0), 20);
    assert.equal(toDayOffset(2), 22);
    assert.equal(toDayOffset(3.9833), 23.9833);
});

test("toDayOffset wraps hours beyond 24 (wake-up after midnight)", () => {
    assert.equal(toDayOffset(30.5), 2.5);
    assert.equal(toDayOffset(28), 0);
});

test("splitSegments returns a single bar when the night does not wrap", () => {
    // 04:30 → 06:00, entirely inside the day column.
    assert.deepEqual(splitSegments({ start: 4.5, end: 6 }), [{ y0: 0.5, y1: 2 }]);
});

test("splitSegments splits a night that spans midnight into two bars", () => {
    // 23:30 → 06:30 wraps across the top of the chart.
    assert.deepEqual(splitSegments({ start: 23.5, end: 30.5 }), [
        { y0: 19.5, y1: 24 },
        { y0: 0, y1: 2.5 },
    ]);
});

test("fmtTime renders a decimal hour as HHhMM", () => {
    assert.equal(fmtTime(23.3333), "23h20");
    assert.equal(fmtTime(6.8333), "06h50");
    assert.equal(fmtTime(4), "04h00");
});

test("fmtDuration renders hours as XhMM", () => {
    assert.equal(fmtDuration(7.5), "7h30");
    assert.equal(fmtDuration(7), "7h00");
    assert.equal(fmtDuration(8.25), "8h15");
});

// Regression: SQL function get_activity_chart_data must return start/end
// relative to the bucket day's midnight, not the entry's calendar day midnight.
// This ensures sleep started between 00:00–04:00 (bucketed to previous day)
// appears after 0h on the Y axis rather than above the chart.

test("bar offset for sleep started before 04:00 (bucketed to previous day)", () => {
    // SQL returns start=25.0, end=32.0 for 01:00→08:00 bucketed to previous day.
    const start = 25.0;
    const end = 32.0;
    const y0 = start - 4; // DAY_START_HOUR = 4
    const y1 = end - 4;
    assert.equal(y0, 21); // appears after 20h on the axis
    assert.equal(y1, 28); // appears at 8h next day
    assert.ok(y0 > 0, "bar starts below the top of the chart");
});

test("bar offset for normal night sleep (23:30→06:30)", () => {
    const start = 23.5;
    const end = 30.5;
    const y0 = start - 4;
    const y1 = end - 4;
    assert.equal(y0, 19.5);
    assert.equal(y1, 26.5);
    assert.ok(y0 > 0, "bar starts below the top of the chart");
});
