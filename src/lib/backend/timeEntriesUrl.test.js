import assert from "node:assert/strict";
import test from "node:test";

import { parseSelectedIds, selectedIdsForEntries, parseSelectionState } from "./timeEntriesSelection.js";

test("parseSelectedIds accepts unique positive safe integers", () => {
    assert.deepEqual(parseSelectedIds("12,4,12,-1,0,nope"), [12, 4]);
});

test("selectedIdsForEntries keeps only entries in the current result page", () => {
    assert.deepEqual(selectedIdsForEntries("12,4,99", [{ id: 4 }, { id: 12 }]), [12, 4]);
});

test("parseSelectionState keeps the page-scoped selection for an explicit id list", () => {
    assert.deepEqual(parseSelectionState("12,4", [{ id: 4 }, { id: 12 }]), {
        selectedIds: [12, 4],
        selectAllMatching: false,
    });
});

test("parseSelectionState resolves the 'all' sentinel without page pruning", () => {
    assert.deepEqual(parseSelectionState("all", [{ id: 4 }, { id: 12 }]), {
        selectedIds: [],
        selectAllMatching: true,
    });
});

test("parseSelectionState returns an empty state when nothing is selected", () => {
    assert.deepEqual(parseSelectionState(null, [{ id: 4 }]), {
        selectedIds: [],
        selectAllMatching: false,
    });
});
