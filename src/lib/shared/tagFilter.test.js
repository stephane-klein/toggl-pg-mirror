import { test } from "node:test";
import assert from "node:assert/strict";

import { splitFilter, extractTagNames, TagFilterError } from "./tagFilter.js";

test("no #: value passes through untouched", () => {
    assert.deepEqual(splitFilter(""), { description: "", tags: null });
    assert.deepEqual(splitFilter("meeting"), { description: "meeting", tags: null });
    assert.deepEqual(splitFilter("foo bar"), { description: "foo bar", tags: null });
    assert.deepEqual(splitFilter('"exact phrase"'), { description: '"exact phrase"', tags: null });
});

test("single tag", () => {
    assert.deepEqual(splitFilter("#meta"), {
        description: "",
        tags: [{ and: ["meta"], not: [] }],
    });
});

test("single tag with case", () => {
    assert.deepEqual(splitFilter("#EPI"), {
        description: "",
        tags: [{ and: ["epi"], not: [] }],
    });
});

test("tag and description words", () => {
    assert.deepEqual(splitFilter("#meta meeting"), {
        description: "meeting",
        tags: [{ and: ["meta"], not: [] }],
    });
    assert.deepEqual(splitFilter("meeting #meta"), {
        description: "meeting",
        tags: [{ and: ["meta"], not: [] }],
    });
});

test("tag with quoted description phrase", () => {
    assert.deepEqual(splitFilter('#meta "exact phrase"'), {
        description: '"exact phrase"',
        tags: [{ and: ["meta"], not: [] }],
    });
});

test("implicit and between tags", () => {
    assert.deepEqual(splitFilter("#a #b"), {
        description: "",
        tags: [{ and: ["a", "b"], not: [] }],
    });
});

test("explicit and", () => {
    assert.deepEqual(splitFilter("#a and #b"), {
        description: "",
        tags: [{ and: ["a", "b"], not: [] }],
    });
});

test("or distributes into dnf", () => {
    assert.deepEqual(splitFilter("#a or #b"), {
        description: "",
        tags: [
            { and: ["a"], not: [] },
            { and: ["b"], not: [] },
        ],
    });
});

test("and over or expands to dnf", () => {
    assert.deepEqual(splitFilter("#x and (#a or #b)"), {
        description: "",
        tags: [
            { and: ["x", "a"], not: [] },
            { and: ["x", "b"], not: [] },
        ],
    });
});

test("not tag", () => {
    assert.deepEqual(splitFilter("not #pause"), {
        description: "",
        tags: [{ and: [], not: ["pause"] }],
    });
});

test("not (or) folds negated tags together", () => {
    assert.deepEqual(splitFilter("not (#a or #b)"), {
        description: "",
        tags: [{ and: [], not: ["a", "b"] }],
    });
});

test("and plus not", () => {
    assert.deepEqual(splitFilter("#x and not #pause"), {
        description: "",
        tags: [{ and: ["x"], not: ["pause"] }],
    });
});

test("french synonyms and symbols", () => {
    assert.deepEqual(splitFilter("#a et #b"), {
        description: "",
        tags: [{ and: ["a", "b"], not: [] }],
    });
    assert.deepEqual(splitFilter("#a ou #b"), {
        description: "",
        tags: [
            { and: ["a"], not: [] },
            { and: ["b"], not: [] },
        ],
    });
    assert.deepEqual(splitFilter("non #a"), {
        description: "",
        tags: [{ and: [], not: ["a"] }],
    });
});

test("hash inside quotes is not a tag", () => {
    assert.deepEqual(splitFilter('"#not-a-tag"'), {
        description: '"#not-a-tag"',
        tags: null,
    });
});

test("unclosed parenthesis is auto-closed (implicitAutoCloseParents)", () => {
    assert.deepEqual(splitFilter("(#a and #b"), {
        description: "",
        tags: [{ and: ["a", "b"], not: [] }],
    });
});

test("stray closing parenthesis throws", () => {
    assert.throws(() => splitFilter(") #a"), TagFilterError);
});

test("dangling operator throws", () => {
    assert.throws(() => splitFilter("#a or"), TagFilterError);
});

test("consecutive operators throw", () => {
    assert.throws(() => splitFilter("#a and and #b"), TagFilterError);
});

test("or/not mixing tags and description throws", () => {
    assert.throws(() => splitFilter("#a or meeting"), TagFilterError);
    assert.throws(() => splitFilter("not meeting #a"), TagFilterError);
    assert.throws(() => splitFilter("#a and (meeting or #b)"), TagFilterError);
});

test("extractTagNames: no tag yields empty list", () => {
    assert.deepEqual(extractTagNames(""), []);
    assert.deepEqual(extractTagNames("meeting"), []);
});

test("extractTagNames: collects and lowercases tag names", () => {
    assert.deepEqual(extractTagNames("#meta"), ["meta"]);
    assert.deepEqual(extractTagNames("#EPI"), ["epi"]);
    assert.deepEqual(extractTagNames("meeting #meta"), ["meta"]);
    assert.deepEqual(extractTagNames("#a #b"), ["a", "b"]);
    assert.deepEqual(extractTagNames("#a or #b"), ["a", "b"]);
    assert.deepEqual(extractTagNames("not #pause"), ["pause"]);
    assert.deepEqual(extractTagNames("#x and #pause"), ["x", "pause"]);
});
