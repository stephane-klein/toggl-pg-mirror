import assert from "node:assert/strict";
import test from "node:test";

import { parseSelectedIds, selectedIdsForEntries } from "./timeEntriesSelection.js";

test("parseSelectedIds accepts unique positive safe integers", () => {
    assert.deepEqual(parseSelectedIds("12,4,12,-1,0,nope"), [12, 4]);
});

test("selectedIdsForEntries keeps only entries in the current result page", () => {
    assert.deepEqual(selectedIdsForEntries("12,4,99", [{ id: 4 }, { id: 12 }]), [12, 4]);
});
