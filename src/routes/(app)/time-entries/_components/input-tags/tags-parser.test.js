import { test } from "node:test";
import assert from "node:assert/strict";

import { extractTags, serializeTags, tokenizeTags } from "./tags-parser.js";

test("extractTags: empty and whitespace-only documents", () => {
    assert.deepEqual(extractTags(""), []);
    assert.deepEqual(extractTags("   "), []);
});

test("extractTags: bare # is not a tag", () => {
    assert.deepEqual(extractTags("#"), []);
});

test("extractTags: simple tags separated by spaces", () => {
    assert.deepEqual(extractTags("#fo"), ["fo"]);
    assert.deepEqual(extractTags("#fo #bar"), ["fo", "bar"]);
});

test("extractTags: quoted tags with spaces", () => {
    assert.deepEqual(extractTags('#"au lit"'), ["au lit"]);
    assert.deepEqual(extractTags('#a #"au lit" #b'), ["a", "au lit", "b"]);
});

test("extractTags: unclosed quoted tag is not a tag yet", () => {
    assert.deepEqual(extractTags('#"au lit'), []);
    assert.deepEqual(extractTags('#"au lit #fo'), ["fo"]);
});

test("extractTags: empty quoted tag is ignored", () => {
    assert.deepEqual(extractTags('#"" #a'), ["a"]);
});

test("extractTags: non-tag words are ignored", () => {
    assert.deepEqual(extractTags("#a b"), ["a"]);
});

test("extractTags: comma is not a tag separator but tolerated", () => {
    assert.deepEqual(extractTags("#a,#b"), ["a", "b"]);
});

test("extractTags: adjacent tags", () => {
    assert.deepEqual(extractTags("#a#b"), ["a", "b"]);
});

test("extractTags: delimiter characters end a plain tag", () => {
    assert.deepEqual(extractTags("#foo(bar)"), ["foo"]);
    assert.deepEqual(extractTags("#foo bar"), ["foo"]);
});

test("extractTags: quoted tag may contain # and delimiters", () => {
    assert.deepEqual(extractTags('#"a#b"'), ["a#b"]);
});

test("serializeTags: plain names get a plain # prefix", () => {
    assert.equal(serializeTags(["tag1", "foo-bar", "1-1"]), "#tag1 #foo-bar #1-1");
});

test("serializeTags: names needing quotes are quoted", () => {
    assert.equal(serializeTags(["au lit"]), '#"au lit"');
    assert.equal(serializeTags(["tag1", "au lit"]), '#tag1 #"au lit"');
});

test("serializeTags: empty list yields empty document", () => {
    assert.equal(serializeTags([]), "");
});

test("round-trip: serializeTags then extractTags preserves names and order", () => {
    const tags = ["a b", "c", "d e f", "g-h"];
    assert.deepEqual(extractTags(serializeTags(tags)), tags);
});

test("tokenizeTags: positions include the # and the closing quote", () => {
    const tokens = tokenizeTags('#a #"au lit"');
    assert.deepEqual(tokens, [
        { name: "a", from: 0, to: 2, quoted: false },
        { name: "au lit", from: 3, to: 12, quoted: true },
    ]);
});
