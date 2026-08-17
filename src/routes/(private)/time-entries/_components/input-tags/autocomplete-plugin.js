// Adapted from svelte-codemirror-search-field (https://github.com/stephane-klein/svelte-codemirror-search-field), MIT license.
import { autocompletion } from "@codemirror/autocomplete";

import { serializeTags } from "./tags-parser.js";

// Matches a `#name` prefix or an in-progress `#"…` quoted tag right before the cursor.
const TAG_PREFIX_RE = /#[^\s#(),[\]{}<>"]*|#"[^"]*/;

// Filter and rank tags for autocomplete. With no matchTags hook the default
// behavior is kept: case-insensitive prefix match (startsWith), no sorting.
// With a hook: a tag matches when the hook returns a score >= 0 (null means no
// match), and options are ranked by score descending — the sort is stable, so
// ties keep the original list order.
export function filterAndRankTags(query, tags, matchTags) {
    if (matchTags == null) {
        const lowerQuery = query.toLowerCase();
        return tags.filter((tag) => tag.toLowerCase().startsWith(lowerQuery));
    }

    const scored = [];
    for (const tag of tags) {
        const score = matchTags(query, tag);
        if (score !== null) scored.push({ tag, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.tag);
}

export function tagAutocompleteExtension(minChars = 1, debounceMs = 100, tagsOrFetcher, matchTags = null) {
    if (tagsOrFetcher == null) {
        return autocompletion({ activateOnTyping: false });
    }

    let tagsCache = Array.isArray(tagsOrFetcher) ? tagsOrFetcher : null;
    let fetchPromise = null;

    async function fetchTags() {
        if (tagsCache) return tagsCache;
        if (fetchPromise) return fetchPromise;

        fetchPromise = (async () => {
            tagsCache = await tagsOrFetcher();
            fetchPromise = null;
            return tagsCache;
        })();

        return fetchPromise;
    }

    function buildOptions(query, from) {
        const filtered = filterAndRankTags(query, tagsCache, matchTags);
        if (filtered.length === 0) return null;

        return {
            from,
            options: filtered.map((tag) => ({
                label: serializeTags([tag]),
                displayLabel: tag,
                apply(view, _completion, from, to) {
                    const insert = `${serializeTags([tag])} `;
                    view.dispatch({
                        changes: { from, to, insert },
                        selection: { anchor: from + insert.length },
                    });
                },
            })),
        };
    }

    function tagCompletionSource(context) {
        const word = context.matchBefore(TAG_PREFIX_RE);
        if (!word) return null;

        const query = word.text.slice(1).replace(/^"/, "");
        if (query.length < minChars) return null;

        if (debounceMs === 0) {
            if (!tagsCache) return fetchTags().then(() => buildOptions(query, word.from));
            return buildOptions(query, word.from);
        }

        return new Promise((resolve) => {
            const timerId = setTimeout(async () => {
                if (context.aborted) {
                    resolve(null);
                    return;
                }
                if (!tagsCache) await fetchTags();
                resolve(buildOptions(query, word.from));
            }, debounceMs);

            context.addEventListener("abort", () => {
                clearTimeout(timerId);
                resolve(null);
            });
        });
    }

    return autocompletion({
        override: [tagCompletionSource],
        activateOnTyping: true,
    });
}
