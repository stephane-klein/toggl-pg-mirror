import { test } from "node:test";
import assert from "node:assert/strict";

import { fuzzyMatch } from "./fuzzyMatch.js";

test("matches characters in order, anywhere in the tag", () => {
    assert.notEqual(fuzzyMatch("nst", "nest"), null);
    assert.notEqual(fuzzyMatch("nst", "constitution"), null);
    assert.notEqual(fuzzyMatch("nst", "noise-trap"), null);
});

test("no match when characters are missing or out of order", () => {
    assert.equal(fuzzyMatch("xyz", "nats"), null);
    assert.equal(fuzzyMatch("abx", "ab"), null);
    assert.equal(fuzzyMatch("nst", "code-review"), null);
});

test("case-insensitive", () => {
    assert.notEqual(fuzzyMatch("NST", "Nest"), null);
    assert.equal(fuzzyMatch("NST", "code-review"), null);
});

test("match at tag start scores higher than a late match", () => {
    assert.ok(fuzzyMatch("rev", "review") > fuzzyMatch("rev", "areview"));
});

test("contiguous characters score higher than scattered ones", () => {
    assert.ok(fuzzyMatch("ab", "abc") > fuzzyMatch("ab", "aXXb"));
});

test("match at start of a word scores higher", () => {
    assert.ok(fuzzyMatch("rev", "code-review") > fuzzyMatch("rev", "irreversible"));
});
