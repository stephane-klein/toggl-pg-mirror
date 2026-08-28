<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    let { value = "" } = $props();

    let inputValue = $derived(value);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let debounceTimer;

    /** @param {string} val */
    function syncUrl(val) {
        const url = new URL($page.url);
        if (val) {
            url.searchParams.set("q", val);
        } else {
            url.searchParams.delete("q");
        }
        goto(url, { replaceState: true, noScroll: true, keepFocus: true });
    }

    /** @param {Event & { currentTarget: HTMLInputElement }} event */
    function handleInput(event) {
        const val = event.currentTarget.value;
        inputValue = val;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => syncUrl(val), 400);
    }

    /** @param {KeyboardEvent} event */
    function handleKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            syncUrl(inputValue);
        }
    }

    function clearSearch() {
        inputValue = "";
        clearTimeout(debounceTimer);
        syncUrl("");
    }
</script>

<div class="flex items-center gap-2 mb-2 max-w-xl">
    <input
        type="search"
        value={inputValue}
        placeholder="Search tags…"
        oninput={handleInput}
        onkeydown={handleKeydown}
        class="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-auto"
    />
    {#if inputValue}
        <button
            onclick={clearSearch}
            class="text-blue-600 font-semibold hover:underline cursor-pointer whitespace-nowrap">clear</button
        >
    {/if}
</div>
