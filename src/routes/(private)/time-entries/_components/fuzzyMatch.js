/**
 * fzf-like fuzzy matcher for tag autocomplete: returns a score when the query
 * characters appear in order in the tag, null otherwise. Used as the
 * `matchTags` prop of svelte-codemirror-search-field.
 *
 * @param {string} query
 * @param {string} tag
 * @returns {number | null}
 */
export function fuzzyMatch(query, tag) {
    const q = query.toLowerCase();
    const t = tag.toLowerCase();
    let queryIndex = 0;
    let score = 0;
    let consecutive = 0;
    let lastMatchIndex = -2;
    for (let i = 0; i < t.length && queryIndex < q.length; i++) {
        if (t[i] !== q[queryIndex]) continue;
        consecutive = i === lastMatchIndex + 1 ? consecutive + 1 : 0;
        score += 10;
        if (i === 0 || /[-_\s/.]/.test(t[i - 1])) score += 10;
        score += consecutive * 5 - Math.min(i, 20);
        lastMatchIndex = i;
        queryIndex++;
    }
    if (queryIndex < q.length) return null;
    return score;
}
