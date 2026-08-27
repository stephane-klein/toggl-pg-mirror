import { test } from "node:test";
import assert from "node:assert/strict";

import { formatHumanDuration } from "./format-duration.js";

test("sub-hour durations are shown in minutes only", () => {
    assert.equal(formatHumanDuration(0), "0m");
    assert.equal(formatHumanDuration(45 * 60), "45m");
    assert.equal(formatHumanDuration(59 * 60 + 59), "59m");
});

test("durations under 24 hours use hours and minutes", () => {
    assert.equal(formatHumanDuration(60 * 60), "1h0m");
    assert.equal(formatHumanDuration(5 * 3600 + 30 * 60), "5h30m");
    assert.equal(formatHumanDuration(23 * 3600 + 59 * 60 + 59), "23h59m");
});

test("durations of a day or more include a days component", () => {
    assert.equal(formatHumanDuration(24 * 3600), "1d 0h0m");
    assert.equal(formatHumanDuration(2 * 24 * 3600 + 5 * 3600 + 30 * 60), "2d 5h30m");
    assert.equal(formatHumanDuration(50 * 3600 + 30 * 60), "2d 2h30m");
});

test("seconds below the minute threshold are truncated, not rounded", () => {
    assert.equal(formatHumanDuration(60 + 30), "1m");
    assert.equal(formatHumanDuration(2 * 3600 + 30), "2h0m");
});
