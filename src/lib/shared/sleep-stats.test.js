import { test } from "node:test";
import assert from "node:assert/strict";

import { computeSleepStats } from "./sleep-stats.js";

test("computeSleepStats keeps only the longest segment per day (naps excluded)", () => {
    const segments = [
        { day: "2026-08-17", start: 8, end: 9 }, // nap
        { day: "2026-08-17", start: 23.5, end: 30.5 }, // main night
        { day: "2026-08-18", start: 24, end: 31 },
    ];
    const stats = computeSleepStats(segments);
    assert.equal(stats.n, 2);
    assert.deepEqual(stats.bedtime.median, (23.5 + 24) / 2);
});

test("computeSleepStats returns null with fewer than 2 nights", () => {
    assert.equal(computeSleepStats([]), null);
    assert.equal(computeSleepStats([{ day: "2026-08-17", start: 23.5, end: 30.5 }]), null);
});

test("median is the middle value for an odd count", () => {
    const stats = computeSleepStats([6, 7, 8].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(stats.duration.median, 7);
});

test("median averages the two middle values for an even count", () => {
    const stats = computeSleepStats([6, 7, 8, 9].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(stats.duration.median, 7.5);
});

test("stddev is the sample standard deviation (÷ n-1)", () => {
    const stats = computeSleepStats([7, 8, 8, 9].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(stats.duration.stddev, Math.sqrt(2 / 3));
});

test("mean is the arithmetic mean of the kept nights", () => {
    const stats = computeSleepStats([6, 7, 8, 9].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(stats.duration.mean, 7.5);
});

test("p25 and p75 use linear-interpolation percentiles (type 7)", () => {
    // n=4: p25 → 6.75, p75 → 8.25.
    const even = computeSleepStats([6, 7, 8, 9].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(even.duration.p25, 6.75);
    assert.equal(even.duration.p75, 8.25);

    // n=7: p25 → 7.5, p75 → 10.5.
    const odd = computeSleepStats(
        [6, 7, 8, 9, 10, 11, 12].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })),
    );
    assert.equal(odd.duration.p25, 7.5);
    assert.equal(odd.duration.p75, 10.5);
});

test("duration min and max span the kept nights", () => {
    const stats = computeSleepStats([6, 7, 8, 9].map((dur, i) => ({ day: `d${i}`, start: 20, end: 20 + dur })));
    assert.equal(stats.duration.min, 6);
    assert.equal(stats.duration.max, 9);
});

test("bedtime and wake min/max span the kept nights", () => {
    const stats = computeSleepStats([
        { day: "2026-08-17", start: 23.5, end: 30.5 },
        { day: "2026-08-18", start: 25, end: 32 },
        { day: "2026-08-19", start: 24, end: 31 },
    ]);
    assert.equal(stats.bedtime.min, 23.5);
    assert.equal(stats.bedtime.max, 25);
    assert.equal(stats.wake.min, 30.5);
    assert.equal(stats.wake.max, 32);
});

test("bedtime median wraps across midnight without polluting the value", () => {
    // 23:30 and 01:00 (start 25.0, bucketed to the previous day).
    const stats = computeSleepStats([
        { day: "2026-08-17", start: 23.5, end: 30.5 },
        { day: "2026-08-18", start: 25, end: 32 },
    ]);
    assert.equal(stats.bedtime.median, 24.25);
    assert.equal(stats.bedtime.median % 24, 0.25); // displayed as 00h15
});
