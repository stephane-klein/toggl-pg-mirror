import { test } from "node:test";
import assert from "node:assert/strict";

import { ACTIVITY_MATRIX_CATEGORIES, cellOpacity, buildActivityMatrix } from "./activity-matrix.js";

const DAYS = ["2026-08-03", "2026-08-04", "2026-08-05"];

const ROWS = [
    { day: "2026-08-03", tag: "restaurant", count: 2, duration_hours: 3 },
    { day: "2026-08-05", tag: "restaurant", count: 1, duration_hours: 1.5 },
    { day: "2026-08-04", tag: "sport", count: 3, duration_hours: 2.75 },
];

test("cellOpacity follows min(0.3 + count * 0.2, 1)", () => {
    const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);
    close(cellOpacity(0), 0.3);
    close(cellOpacity(1), 0.5);
    close(cellOpacity(2), 0.7);
    close(cellOpacity(3), 0.9);
    assert.equal(cellOpacity(4), 1);
    assert.equal(cellOpacity(10), 1);
});

test("ACTIVITY_MATRIX_CATEGORIES keeps the fixed significant order", () => {
    assert.deepEqual(
        ACTIVITY_MATRIX_CATEGORIES.map((c) => c.key),
        ["restaurant", "sport", "fastfood", "courses", "metro", "velo"],
    );
    assert.ok(ACTIVITY_MATRIX_CATEGORIES.every((c) => c.label && c.tag && c.color));
});

test("buildActivityMatrix returns one row per category, in config order", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, ROWS);
    assert.equal(grid.length, ACTIVITY_MATRIX_CATEGORIES.length);
    assert.deepEqual(
        grid.map((row) => row.category.key),
        ACTIVITY_MATRIX_CATEGORIES.map((c) => c.key),
    );
});

test("buildActivityMatrix fills zero cells for days without the tag", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, ROWS);
    const sport = grid.find((row) => row.category.key === "sport");
    assert.deepEqual(sport.cells, [
        { day: "2026-08-03", count: 0, durationHours: 0 },
        { day: "2026-08-04", count: 3, durationHours: 2.75 },
        { day: "2026-08-05", count: 0, durationHours: 0 },
    ]);
});

test("buildActivityMatrix aligns cells with the days order", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, ROWS);
    const restaurant = grid.find((row) => row.category.key === "restaurant");
    assert.deepEqual(
        restaurant.cells.map((cell) => cell.count),
        [2, 0, 1],
    );
});

test("buildActivityMatrix maps rows to categories by tag", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, ROWS);
    const restaurant = grid.find((row) => row.category.key === "restaurant");
    assert.deepEqual(restaurant.cells[0], { day: "2026-08-03", count: 2, durationHours: 3 });
});

test("buildActivityMatrix returns all-zero rows when no rows match", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, []);
    assert.ok(grid.every((row) => row.cells.every((cell) => cell.count === 0 && cell.durationHours === 0)));
});

test("buildActivityMatrix gives every cell its day, for a duplicate-free template key", () => {
    const grid = buildActivityMatrix(DAYS, ACTIVITY_MATRIX_CATEGORIES, ROWS);
    assert.ok(
        grid.every((row) => row.cells.every((cell, i) => cell.day === DAYS[i] && row.category.key + ":" + cell.day)),
    );
    const keys = grid.flatMap((row) => row.cells.map((cell) => `${row.category.key}:${cell.day}`));
    assert.equal(new Set(keys).size, keys.length);
});
