// Tag token grammar shared by the InputTags editor and its value extraction.
// A tag is written `#name` (name = [^\s#(),\[\]{}<>"]+) or, when the name
// contains whitespace or one of those delimiter characters, `#"name"`.

const TAG_TOKEN_RE = /#"([^"]*)"|#([^\s#(),[\]{}<>"]+)/g;

const PLAIN_TAG_RE = /^[^\s#(),[\]{}<>"]+$/;

/**
 * Tokenizes a document into tag tokens with their offsets.
 * Bare `#` and unclosed `#"` tokens are ignored (they are not tags yet).
 * @param {string} doc
 * @returns {{ name: string, from: number, to: number, quoted: boolean }[]}
 */
export function tokenizeTags(doc) {
    const tokens = [];
    TAG_TOKEN_RE.lastIndex = 0;
    for (let m = TAG_TOKEN_RE.exec(doc); m !== null; m = TAG_TOKEN_RE.exec(doc)) {
        const quoted = m[1] !== undefined;
        const name = quoted ? m[1] : m[2];
        if (name === "") continue;
        tokens.push({ name, from: m.index, to: m.index + m[0].length, quoted });
    }
    return tokens;
}

/**
 * Tag names present in a document, in order, without `#` or quotes.
 * @param {string} doc
 * @returns {string[]}
 */
export function extractTags(doc) {
    return tokenizeTags(doc).map((token) => token.name);
}

/**
 * Serializes tag names into a document: `#name`, or `#"name"` when the name
 * cannot be represented with the plain charset.
 * @param {string[]} tags
 * @returns {string}
 */
export function serializeTags(tags) {
    return tags.map((tag) => (PLAIN_TAG_RE.test(tag) ? `#${tag}` : `#"${tag}"`)).join(" ");
}
