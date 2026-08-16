// Adapted from svelte-codemirror-search-field (https://github.com/stephane-klein/svelte-codemirror-search-field), MIT license.
import { ViewPlugin, Decoration } from "@codemirror/view";

import { TagWidget } from "./tag-widget.js";
import { tokenizeTags } from "./tags-parser.js";

// Tag tokens to conceal as pills: every complete tag whose range stays at
// least `threshold` chars away from any selection.
function buildConcealments(docStr, threshold, selections, hasFocus) {
    const docLength = docStr.length;
    const concealments = [];
    for (const token of tokenizeTags(docStr)) {
        const from = Math.max(0, token.from - threshold);
        const to = Math.min(docLength, token.to + threshold);
        const nearCursor = hasFocus && selections.some((sel) => from <= sel.to && sel.from <= to);
        if (nearCursor) continue;
        concealments.push({ from: token.from, to: token.to, text: token.name });
    }
    return concealments;
}

function tagDecorations(view, threshold) {
    const widgets = [];
    const docStr = view.state.doc.toString();
    const selections = view.state.selection.ranges;

    const concealments = buildConcealments(docStr, threshold, selections, view.hasFocus);

    for (const c of concealments) {
        const widget = new TagWidget({
            tag: c.text,
            onClick: () => {
                view.dispatch({ selection: { anchor: c.to }, scrollIntoView: true });
                view.focus();
            },
        });
        widgets.push(Decoration.replace({}).range(c.from, c.to));
        widgets.push(Decoration.widget({ widget }).range(c.from));
    }

    return Decoration.set(widgets, true);
}

export function concealPlugin(threshold = 0) {
    return ViewPlugin.fromClass(
        class {
            constructor(view) {
                this.decorations = tagDecorations(view, threshold);
            }

            update(update) {
                if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
                    this.decorations = tagDecorations(update.view, threshold);
                }
            }
        },
        { decorations: (v) => v.decorations },
    );
}
