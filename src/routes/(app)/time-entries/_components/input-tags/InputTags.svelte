<script>
    import { untrack } from "svelte";
    import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection } from "@codemirror/view";
    import { EditorState, Compartment } from "@codemirror/state";
    import { history, historyKeymap, selectAll } from "@codemirror/commands";

    import { concealPlugin } from "./conceal-plugin.js";
    import { tagAutocompleteExtension } from "./autocomplete-plugin.js";
    import { editorTheme } from "./editor-theme.js";
    import { extractTags, serializeTags } from "./tags-parser.js";

    let {
        id = undefined,
        value = $bindable([]),
        placeholder = "",
        tags = null,
        matchTags = null,
        autocompleteMinChars = 0,
        autocompleteDebounceMs = 200,
        disabled = false,
    } = $props();

    /** @type {HTMLDivElement | undefined} */
    let container;
    /** @type {import("@codemirror/view").EditorView | undefined} */
    let view;

    const concealCompartment = new Compartment();
    const autocompleteCompartment = new Compartment();
    const readonlyCompartment = new Compartment();

    const singleLine = EditorState.transactionFilter.of((tr) => {
        if (tr.newDoc.lines > 1) return [];
        return tr;
    });

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            value = extractTags(update.state.doc.toString());
        }
    });

    $effect(() => {
        if (!container) return;

        const initialDoc = untrack(() => serializeTags(value));
        const initialPlaceholder = untrack(() => placeholder);
        const initialTags = untrack(() => tags);
        const initialMatchTags = untrack(() => matchTags);
        const initialDisabled = untrack(() => disabled);

        view = new EditorView({
            doc: initialDoc,
            extensions: [
                singleLine,
                updateListener,
                cmPlaceholder(initialPlaceholder),
                drawSelection(),
                // Without defaultKeymap's Enter: it would swallow Enter even when
                // the single-line filter rejects the newline transaction, hiding
                // it from the parent save handler. Only the autocomplete popup's
                // Enter (accept completion) stays handled by CodeMirror.
                keymap.of([...historyKeymap, { key: "Mod-a", run: selectAll }]),
                history(),
                concealCompartment.of(concealPlugin()),
                autocompleteCompartment.of(
                    tagAutocompleteExtension(
                        autocompleteMinChars,
                        autocompleteDebounceMs,
                        initialTags,
                        initialMatchTags,
                    ),
                ),
                readonlyCompartment.of(EditorState.readOnly.of(initialDisabled)),
                editorTheme,
            ],
            parent: container,
        });

        const createdView = view;

        return () => {
            createdView.destroy();
            view = undefined;
        };
    });

    $effect(() => {
        const targetDoc = serializeTags(value);
        if (!view) return;
        if (view.hasFocus) return;
        if (view.state.doc.toString() === targetDoc) return;
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: targetDoc },
            selection: { anchor: targetDoc.length },
        });
    });

    $effect(() => {
        if (!view) return;
        view.dispatch({
            effects: [
                concealCompartment.reconfigure(concealPlugin()),
                autocompleteCompartment.reconfigure(
                    tagAutocompleteExtension(autocompleteMinChars, autocompleteDebounceMs, tags, matchTags),
                ),
                readonlyCompartment.reconfigure(EditorState.readOnly.of(disabled)),
            ],
        });
    });

    function handleFocus() {
        if (view && !view.hasFocus) view.focus();
    }
</script>

<div
    {id}
    bind:this={container}
    tabindex="-1"
    class="input-tags box-border h-[30px] w-full rounded border border-gray-300 bg-white px-2 text-[12px]"
    class:opacity-60={disabled}
    onfocus={handleFocus}
></div>

<style>
    .input-tags :global(.cm-content) {
        padding: 0;
        font-size: 12px;
        line-height: 30px;
    }
    .input-tags:focus-within {
        outline: auto;
    }
</style>
