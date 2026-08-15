<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import SearchField from "svelte-codemirror-search-field";
    import { getAllTags } from "./tags.remote.js";
    import { fuzzyMatch } from "./fuzzyMatch.js";
    import { splitFilter, extractTagNames, TagFilterError } from "$lib/backend/tagFilter.js";

    let { total = null } = $props();

    function getUrlQ() {
        return $page.url.searchParams.get("q") || "";
    }

    // inputValue drives the SearchField doc prop AND the status line below the
    // field. It follows the URL on navigation, while handleChange/setNullFilter/
    // clearFilter temporarily override it (writable $derived, Svelte >= 5.25):
    // clearing the field must work even when the URL does not change yet (the
    // debounce has not flushed q=, or q is already absent).
    let inputValue = $derived(getUrlQ());
    let isPending = $state(false);
    /** @type {string | null} */
    let filterError = $state(null);
    // Neutral blocker hint (e.g. incomplete tag), shown only while inputValue
    // still equals the value it refers to.
    /** @type {{ value: string, message: string } | null} */
    let hint = $state(null);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let debounceTimer;
    // Monotonic guard so a stale async tag check never arms the debounce timer
    // after the field has moved on (clearFilter, Enter, newer keystrokes).
    let syncSeq = 0;
    /** @type {Promise<Set<string>> | null} */
    let knownTagsPromise = null;

    function getKnownTags() {
        return (knownTagsPromise ??= getAllTags().then((tags) => new Set(tags.map((tag) => tag.toLowerCase()))));
    }

    function isBareHash(value) {
        return /^#+\s*$/.test(value);
    }

    /** @param {string} value */
    function validate(value) {
        try {
            splitFilter(value);
            return null;
        } catch (e) {
            if (e instanceof TagFilterError) return e.message;
            throw e;
        }
    }

    /** @param {string} value */
    function syncUrl(value) {
        const url = new URL($page.url);
        if (value) {
            url.searchParams.set("q", value);
        } else {
            url.searchParams.delete("q");
        }
        goto(url, { replaceState: true, noScroll: true, keepFocus: true });
    }

    /** @param {string} value */
    function scheduleSync(value) {
        clearTimeout(debounceTimer);
        const seq = ++syncSeq;
        const err = validate(value);
        filterError = err;
        if (err) {
            isPending = false;
            return;
        }
        if (isBareHash(value)) {
            isPending = false;
            hint = { value, message: "Only # — type a tag name or pick from suggestions" };
            return;
        }
        getKnownTags().then((known) => {
            if (seq !== syncSeq) return;
            const missing = extractTagNames(value).find((name) => !known.has(name));
            if (missing) {
                isPending = false;
                hint = { value, message: `Tag "#${missing}" not found — choose from suggestions` };
                return;
            }
            hint = null;
            isPending = true;
            debounceTimer = setTimeout(() => {
                isPending = false;
                syncUrl(value);
            }, 500);
        });
    }

    /** @param {string} value */
    function handleChange(value) {
        inputValue = value;
        scheduleSync(value);
    }

    /** @param {KeyboardEvent} event */
    function handleKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            syncSeq++;
            isPending = false;
            const err = validate(inputValue);
            filterError = err;
            if (err) return;
            if (isBareHash(inputValue)) {
                hint = { value: inputValue, message: "Only # — type a tag name or pick from suggestions" };
                return;
            }
            hint = null;
            syncUrl(inputValue);
        }
    }

    function setNullFilter() {
        inputValue = "/null";
        clearTimeout(debounceTimer);
        syncSeq++;
        isPending = false;
        filterError = null;
        hint = null;
        syncUrl("/null");
    }

    function clearFilter() {
        inputValue = "";
        clearTimeout(debounceTimer);
        syncSeq++;
        isPending = false;
        filterError = null;
        hint = null;
        syncUrl("");
    }
</script>

<div
    class="py-2"
    onkeydown={handleKeydown}
>
    <div class="filter-field">
        <SearchField
            doc={inputValue}
            ph="Filter…  #tag and/or/not (parens)"
            tags={getAllTags}
            matchTags={fuzzyMatch}
            showImplicit
            implicitOp="and"
            implicitAutoCloseParents
            onchange={handleChange}
        />
    </div>
    <div class="flex items-baseline gap-2 mt-1 text-[12px]">
        {#if filterError}
            <span class="text-red-600 italic">Invalid filter: {filterError}</span>
        {:else if inputValue === "/null"}
            <span class="text-gray-600 italic">Showing entries with no description</span>
            {#if total !== null}
                <span class="text-gray-400">· {total.toLocaleString("en")} result{total !== 1 ? "s" : ""}</span>
            {/if}
            <button
                onclick={clearFilter}
                class="text-blue-600 font-semibold hover:underline cursor-pointer">clear filter</button
            >
        {:else if hint && inputValue === hint.value}
            <span class="text-gray-500 italic">{hint.message}</span>
            <button
                onclick={clearFilter}
                class="text-blue-600 font-semibold hover:underline cursor-pointer">clear filter</button
            >
        {:else if inputValue}
            {#if isPending}
                <span class="spinner text-gray-400">⟳</span>
            {/if}
            <button
                onclick={clearFilter}
                class="text-blue-600 font-semibold hover:underline cursor-pointer">clear filter</button
            >
        {:else}
            <span class="text-gray-500 select-none">Presets:</span>
            <button
                onclick={setNullFilter}
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline cursor-pointer"
                >Time entries with empty description</button
            >
        {/if}
    </div>
</div>

<style>
    .filter-field :global(.editor-wrapper) {
        width: 100%;
        border-color: #d1d5db;
        border-radius: 0.25rem;
    }
    .filter-field :global(.editor-wrapper:focus-within) {
        border-color: #d1d5db;
        outline: auto;
    }
    .filter-field :global(.cm-content) {
        font-size: 13px;
        padding: 6px 8px;
        line-height: 1.5;
    }
    .spinner {
        display: inline-block;
        animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
