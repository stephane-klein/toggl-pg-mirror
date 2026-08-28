import { test } from "node:test";
import assert from "node:assert/strict";

import {
    MIN_DAY_CELL_WIDTH,
    DAY_CHART_LEFT_GUTTER,
    DAY_CHART_RIGHT_MARGIN,
    computeDayColumns,
} from "./chart-day-columns.js";

test("SSR default returns the minimum cell width", () => {
    assert.deepEqual(computeDayColumns(null, 30), {
        cellWidth: MIN_DAY_CELL_WIDTH,
        plotWidth: 30 * MIN_DAY_CELL_WIDTH,
    });
});

test("a wide container splits its usable width evenly", () => {
    const { cellWidth, plotWidth } = computeDayColumns(1865, 30);
    const usable = 1865 - DAY_CHART_LEFT_GUTTER - DAY_CHART_RIGHT_MARGIN;
    assert.equal(cellWidth, Math.floor(usable / 30));
    assert.equal(plotWidth, cellWidth * 30);
});

test("identical inputs always yield identical outputs", () => {
    assert.deepEqual(computeDayColumns(1234, 12), computeDayColumns(1234, 12));
});

test("a narrow container keeps the minimum cell width", () => {
    const { cellWidth } = computeDayColumns(300, 30);
    assert.equal(cellWidth, MIN_DAY_CELL_WIDTH);
});

test("zero days is guarded without crashing", () => {
    const { cellWidth, plotWidth } = computeDayColumns(1000, 0);
    assert.equal(plotWidth, 0);
    assert.ok(cellWidth >= MIN_DAY_CELL_WIDTH);
});
