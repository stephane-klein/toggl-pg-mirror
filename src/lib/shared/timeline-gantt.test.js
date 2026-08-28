import { test } from "node:test";
import assert from "node:assert/strict";

import {
    UNCATEGORIZED_LABEL,
    UNCATEGORIZED_COLOR,
    PERIOD_COLORS,
    categoryColor,
    buildTimelineGantt,
} from "./timeline-gantt.js";

const FROM = "2026-08-01";
const TO = "2026-09-01";

function period(id, start_date, end_date, category = null, title = `p${id}`, ongoing = end_date === null) {
    return { id, category, title, start_date, end_date, ongoing };
}

test("overlapping periods of one category stack, newest below oldest", () => {
    const a = period(1, "2026-08-05", "2026-08-20", "Work");
    const b = period(2, "2026-08-10", "2026-08-25", "Work");
    const [group] = buildTimelineGantt([a, b], FROM, TO);
    assert.equal(group.category, "Work");
    assert.equal(group.lanes.length, 2);
    assert.deepEqual(
        group.lanes[0].map((p) => p.id),
        [1],
    );
    assert.deepEqual(
        group.lanes[1].map((p) => p.id),
        [2],
    );
});

test("adjacent periods share the same lane", () => {
    const a = period(1, "2026-08-05", "2026-08-10", "Work");
    const b = period(2, "2026-08-10", "2026-08-20", "Work");
    const [group] = buildTimelineGantt([a, b], FROM, TO);
    assert.equal(group.lanes.length, 1);
    assert.deepEqual(
        group.lanes[0].map((p) => p.id),
        [1, 2],
    );
});

test("a period can return to an earlier lane after a gap", () => {
    const a = period(1, "2026-08-05", "2026-08-10", "Work");
    const b = period(2, "2026-08-08", "2026-08-15", "Work");
    const c = period(3, "2026-08-20", "2026-08-25", "Work");
    const [group] = buildTimelineGantt([a, b, c], FROM, TO);
    assert.deepEqual(
        group.lanes.map((lane) => lane.map((p) => p.id)),
        [[1, 3], [2]],
    );
});

test("ongoing period is clipped to the window end and flagged", () => {
    const [group] = buildTimelineGantt([period(1, "2026-08-05", null, "Work", "Job", true)], FROM, TO);
    const [p] = group.lanes[0];
    assert.equal(p.start, "2026-08-05");
    assert.equal(p.end, TO);
    assert.equal(p.ongoing, true);
});

test("period extending past the window is clipped without ongoing flag", () => {
    const [group] = buildTimelineGantt([period(1, "2026-08-05", "2026-10-01", "Work")], FROM, TO);
    const [p] = group.lanes[0];
    assert.equal(p.start, "2026-08-05");
    assert.equal(p.end, TO);
    assert.equal(p.ongoing, false);
});

test("period starting before the window is clipped at its start", () => {
    const [group] = buildTimelineGantt([period(1, "2026-07-25", "2026-08-10", "Work")], FROM, TO);
    const [p] = group.lanes[0];
    assert.equal(p.start, FROM);
    assert.equal(p.end, "2026-08-10");
});

test("periods outside the window are dropped", () => {
    const before = period(1, "2026-07-01", "2026-07-31", "Work");
    const endsAtFrom = period(2, "2026-07-01", FROM, "Work");
    const startsAtTo = period(3, TO, "2026-09-15", "Work");
    assert.deepEqual(buildTimelineGantt([before, endsAtFrom, startsAtTo], FROM, TO), []);
});

test("null category becomes the trailing Uncategorized lane", () => {
    const a = period(1, "2026-08-05", "2026-08-20", "Work");
    const b = period(2, "2026-08-10", "2026-08-25", null);
    const groups = buildTimelineGantt([a, b], FROM, TO);
    assert.deepEqual(
        groups.map((g) => g.category),
        ["Work", UNCATEGORIZED_LABEL],
    );
    const uncategorized = groups[1];
    assert.equal(uncategorized.color, UNCATEGORIZED_COLOR);
    assert.deepEqual(
        uncategorized.lanes[0].map((p) => p.id),
        [2],
    );
});

test("categories are ordered by first chronological appearance", () => {
    const a = period(1, "2026-08-20", "2026-08-25", "Work");
    const b = period(2, "2026-08-05", "2026-08-10", "Sport");
    const c = period(3, "2026-08-15", "2026-08-18", null);
    const groups = buildTimelineGantt([a, b, c], FROM, TO);
    assert.deepEqual(
        groups.map((g) => g.category),
        ["Sport", UNCATEGORIZED_LABEL, "Work"],
    );
});

test("category color is deterministic", () => {
    assert.equal(categoryColor("Work"), categoryColor("Work"));
    assert.equal(categoryColor(UNCATEGORIZED_LABEL), UNCATEGORIZED_COLOR);
    assert.ok(!PERIOD_COLORS.includes(categoryColor(UNCATEGORIZED_LABEL)));
});
