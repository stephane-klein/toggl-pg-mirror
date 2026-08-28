import assert from "node:assert/strict";
import test from "node:test";

import { formatTimelineEventDates, validateTimelineEvent } from "./timeline-event.js";

test("accepts a milestone with no end_date", () => {
    assert.deepEqual(validateTimelineEvent({ type: "milestone", title: "PhD", startDate: "2015-06-30" }), {
        ok: true,
        errors: {},
    });
});

test("accepts a milestone with end_date equal to start_date", () => {
    const result = validateTimelineEvent({
        type: "milestone",
        title: "Move",
        startDate: "2018-09-01",
        endDate: "2018-09-01",
    });
    assert.equal(result.ok, true);
});

test("rejects a milestone with an end_date after start_date", () => {
    const result = validateTimelineEvent({
        type: "milestone",
        title: "Move",
        startDate: "2018-09-01",
        endDate: "2018-09-02",
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.endDate);
});

test("accepts an ongoing period with no end_date", () => {
    const result = validateTimelineEvent({ type: "period", title: "At Acme", startDate: "2020-01-01" });
    assert.equal(result.ok, true);
});

test("accepts a period ending after start_date", () => {
    const result = validateTimelineEvent({
        type: "period",
        title: "Vacation",
        startDate: "2024-07-01",
        endDate: "2024-07-15",
    });
    assert.equal(result.ok, true);
});

test("rejects a period whose end_date equals or precedes start_date", () => {
    const sameDay = validateTimelineEvent({
        type: "period",
        title: "One-day trip",
        startDate: "2024-07-01",
        endDate: "2024-07-01",
    });
    assert.equal(sameDay.ok, false);
    assert.ok(sameDay.errors.endDate);

    const inverted = validateTimelineEvent({
        type: "period",
        title: "Backwards",
        startDate: "2024-07-15",
        endDate: "2024-07-01",
    });
    assert.equal(inverted.ok, false);
    assert.ok(inverted.errors.endDate);
});

test("rejects an empty title and a missing start_date", () => {
    const result = validateTimelineEvent({ type: "milestone", title: "  ", startDate: "" });
    assert.equal(result.ok, false);
    assert.ok(result.errors.title);
    assert.ok(result.errors.startDate);
});

test("rejects an unknown type and an invalid date format", () => {
    const result = validateTimelineEvent({ type: "era", title: "X", startDate: "2024-13-40" });
    assert.equal(result.ok, false);
    assert.ok(result.errors.type);
    assert.ok(result.errors.startDate);
});

test("formatTimelineEventDates renders a milestone as its single date", () => {
    assert.equal(
        formatTimelineEventDates({ type: "milestone", start_date: "2015-06-30", end_date: null }),
        "2015-06-30",
    );
});

test("formatTimelineEventDates renders an ongoing period with a present marker", () => {
    assert.equal(
        formatTimelineEventDates({ type: "period", start_date: "2020-01-01", end_date: null }),
        "2020-01-01 → present",
    );
});

test("formatTimelineEventDates renders a ended period as a range", () => {
    assert.equal(
        formatTimelineEventDates({ type: "period", start_date: "2024-07-01", end_date: "2024-07-15" }),
        "2024-07-01 → 2024-07-15",
    );
});
