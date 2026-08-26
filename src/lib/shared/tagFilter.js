import { parse } from "svelte-codemirror-search-field/parser";

export class TagFilterError extends Error {}

function containsDescription(node) {
    if (!node) return false;
    switch (node.type) {
        case "unknown":
        case "quoted":
            return true;
        case "tag":
            return false;
        case "not":
            return containsDescription(node.operand);
        case "and":
        case "or":
            return containsDescription(node.left) || containsDescription(node.right);
        default:
            return false;
    }
}

// Rejects any or/not node whose subtree contains description words: the _q DSL
// has no or/not over descriptions, so such an expression is not expressible.
function validateOperators(node) {
    if (!node) return;
    switch (node.type) {
        case "or":
        case "not":
            if (containsDescription(node)) {
                throw new TagFilterError(
                    "or/not cannot apply to description words; only and may combine tags with description",
                );
            }
            validateOperators(node.left ?? node.operand);
            validateOperators(node.right);
            break;
        case "and":
            validateOperators(node.left);
            validateOperators(node.right);
            break;
        default:
            break;
    }
}

// Collects the description leaves (words, quoted phrases) of the AST in order.
function collectDescription(node, parts) {
    if (!node) return;
    switch (node.type) {
        case "unknown":
            parts.push(node.text);
            break;
        case "quoted":
            parts.push(`"${node.text}"`);
            break;
        case "and":
            collectDescription(node.left, parts);
            collectDescription(node.right, parts);
            break;
        // not/or nodes mixing description with tags are rejected upfront in
        // splitFilter: those operators cannot cross the description/tags boundary.
        default:
            break;
    }
}

// DNF of a tag-only expression: array of conjuncts { and: string[], not: string[] },
// interpreted as OR over conjuncts, each (ALL(and) AND NONE(not)).
// A node with no tag leaf yields the identity conjunct [{ and: [], not: [] }].
function tagDnf(node) {
    if (!node) return [{ and: [], not: [] }];
    switch (node.type) {
        case "tag":
            return [{ and: [node.name.toLowerCase()], not: [] }];
        case "not":
            return negate(tagDnf(node.operand));
        case "and":
            return product(tagDnf(node.left), tagDnf(node.right));
        case "or":
            return [...tagDnf(node.left), ...tagDnf(node.right)];
        default:
            return [{ and: [], not: [] }];
    }
}

function negate(conjuncts) {
    // NOT(c1 OR ... OR cn) = AND_i NOT(ci), distributed via the DNF product.
    // NOT({and: A, not: B}) = (OR over a in A of NOT a) OR (OR over b in B of b):
    // one conjunct per literal, negated literals as {and: [], not: [a]} and
    // plain literals as {and: [b], not: []}. A conjunct with empty A and B
    // yields no literals (FALSE), contributing nothing.
    const perConjunct = conjuncts.map((c) => [
        ...c.and.map((a) => ({ and: [], not: [a] })),
        ...c.not.map((b) => ({ and: [b], not: [] })),
    ]);
    return perConjunct.reduce((acc, options) => product(acc, options), IDENTITY);
}

function product(left, right) {
    const out = [];
    for (const a of left) {
        for (const b of right) {
            out.push({ and: [...a.and, ...b.and], not: [...a.not, ...b.not] });
        }
    }
    return out;
}

const IDENTITY = [{ and: [], not: [] }];

// Splits a filter field value into its description part (words/quoted phrases,
// re-serialized for the _q DSL) and its tag part (DNF for the _tags parameter).
// Without any '#' the value is left untouched (regression-free). Parsed with the
// same options as the SearchField component (implicitOp + implicitAutoCloseParents)
// so the server accepts exactly what the UI shows. Throws TagFilterError on
// parse errors or on boolean expressions that mix tags and description words
// under or/not (not expressible in the _q + _tags contract).
export function splitFilter(q) {
    if (!q.includes("#")) return { description: q, tags: null };

    const { ast, errors } = parse(q, { implicitOp: "and", implicitAutoCloseParents: true });
    if (errors.length > 0) throw new TagFilterError(errors[0].message);
    if (!ast) return { description: q, tags: null };

    validateOperators(ast);

    const parts = [];
    collectDescription(ast, parts);

    const dnf = tagDnf(ast);
    const tags = JSON.stringify(dnf) === JSON.stringify(IDENTITY) ? null : dnf;

    return { description: parts.join(" "), tags };
}

// Names of every tag referenced by a filter value (lowercased), or [] when the
// value carries no tag. Used to detect incomplete tags (typing in progress)
// against the list of tags known to the database.
/**
 * @param {string} q
 * @returns {string[]}
 */
export function extractTagNames(q) {
    const { tags } = splitFilter(q);
    if (!tags) return [];
    return tags.flatMap((conjunct) => [...conjunct.and, ...conjunct.not]);
}
