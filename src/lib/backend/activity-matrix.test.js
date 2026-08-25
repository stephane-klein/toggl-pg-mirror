import { test } from "node:test";
import assert from "node:assert/strict";

import { cellOpacity, buildActivityMatrix } from "./activity-matrix.js";

const DAYS = ["2026-08-03", "2026-08-04", "2026-08-05"];

// Local fixture — the category list is user-configured, there is no built-in
// default anymore.
const CATEGORIES = [
    { label: "Restaurant", tag: "restaurant", color: "#D62828" },
    { label: "Sport", tag: "sport", color: "#2A9D8F" },
    { label: "Fastfood", tag: "fastfood", color: "#F77F00" },
    { label: "Courses", tag: "courses", color: "#8338EC" },
    { label: "Métro", tag: "metro", color: "#2196F3" },
    { label: "Vélo", tag: "vélo", color: "#4CAF50" },
];

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

test("buildActivityMatrix returns no rows when no categories are configured", () => {
    assert.deepEqual(buildActivityMatrix(DAYS, [], ROWS), []);
});

test("buildActivityMatrix returns one row per category, in config order", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, ROWS);
    assert.equal(grid.length, CATEGORIES.length);
    assert.deepEqual(
        grid.map((row) => row.category.tag),
        CATEGORIES.map((c) => c.tag),
    );
});

test("buildActivityMatrix fills zero cells for days without the tag", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, ROWS);
    const sport = grid.find((row) => row.category.tag === "sport");
    assert.deepEqual(sport.cells, [
        { day: "2026-08-03", count: 0, durationHours: 0 },
        { day: "2026-08-04", count: 3, durationHours: 2.75 },
        { day: "2026-08-05", count: 0, durationHours: 0 },
    ]);
});

test("buildActivityMatrix aligns cells with the days order", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, ROWS);
    const restaurant = grid.find((row) => row.category.tag === "restaurant");
    assert.deepEqual(
        restaurant.cells.map((cell) => cell.count),
        [2, 0, 1],
    );
});

test("buildActivityMatrix maps rows to categories by tag", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, ROWS);
    const restaurant = grid.find((row) => row.category.tag === "restaurant");
    assert.deepEqual(restaurant.cells[0], { day: "2026-08-03", count: 2, durationHours: 3 });
});

test("buildActivityMatrix matches rows case-insensitively (SQL lowercases tags)", () => {
    const categories = [{ label: "Vélo", tag: "Vélo", color: "#4CAF50" }];
    const rows = [{ day: "2026-08-03", tag: "vélo", count: 2, duration_hours: 1 }];
    const grid = buildActivityMatrix(DAYS, categories, rows);
    assert.deepEqual(grid[0].cells[0], { day: "2026-08-03", count: 2, durationHours: 1 });
});

test("buildActivityMatrix returns all-zero rows when no rows match", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, []);
    assert.ok(grid.every((row) => row.cells.every((cell) => cell.count === 0 && cell.durationHours === 0)));
});

test("buildActivityMatrix gives every cell its day, for a duplicate-free template key", () => {
    const grid = buildActivityMatrix(DAYS, CATEGORIES, ROWS);
    assert.ok(
        grid.every((row) => row.cells.every((cell, i) => cell.day === DAYS[i] && row.category.tag + ":" + cell.day)),
    );
    const keys = grid.flatMap((row) => row.cells.map((cell) => `${row.category.tag}:${cell.day}`));
    assert.equal(new Set(keys).size, keys.length);
});
