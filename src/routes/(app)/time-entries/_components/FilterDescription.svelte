<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { untrack } from "svelte";

    let { total = null } = $props();

    function getUrlQ() {
        return $page.url.searchParams.get("q") || "";
    }

    let inputValue = $state(getUrlQ());
    let isPending = $state(false);
    let debounceTimer;

    $effect(() => {
        const urlQ = getUrlQ();
        if (untrack(() => inputValue) !== urlQ) {
            inputValue = urlQ;
        }
    });

    function syncUrl(value) {
        const url = new URL($page.url);
        if (value) {
            url.searchParams.set("q", value);
        } else {
            url.searchParams.delete("q");
        }
        goto(url, { replaceState: true, noScroll: true, keepFocus: true });
    }

    function scheduleSync(value) {
        clearTimeout(debounceTimer);
        isPending = true;
        debounceTimer = setTimeout(() => {
            isPending = false;
            syncUrl(value);
        }, 500);
    }

    function handleInput() {
        scheduleSync(inputValue);
    }

    function handleKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            isPending = false;
            syncUrl(inputValue);
        }
    }

    function setNullFilter() {
        inputValue = "/null";
        clearTimeout(debounceTimer);
        isPending = false;
        syncUrl("/null");
    }

    function clearFilter() {
        inputValue = "";
        clearTimeout(debounceTimer);
        isPending = false;
        syncUrl("");
    }
</script>

<div class="py-2">
    <input
        type="search"
        bind:value={inputValue}
        onkeydown={handleKeydown}
        oninput={handleInput}
        placeholder="Filter descriptions…"
        class="w-full px-2 py-[3px] text-[13px] border border-gray-300 rounded focus:outline-none focus:border-blue-500"
    />
    <div class="flex items-baseline gap-2 mt-1 text-[12px]">
        {#if inputValue === "/null"}
            <span class="text-gray-600 italic">Showing entries with no description</span>
            {#if total !== null}
                <span class="text-gray-400">· {total.toLocaleString("en")} result{total !== 1 ? "s" : ""}</span>
            {/if}
            <button
                onclick={clearFilter}
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline cursor-pointer">Clear</button
            >
        {:else if inputValue}
            <span class="text-gray-600 italic">Filter: {inputValue}</span>
            {#if total !== null}
                <span class="text-gray-400">· {total.toLocaleString("en")} result{total !== 1 ? "s" : ""}</span>
            {/if}
            {#if isPending}
                <span class="spinner text-gray-400">⟳</span>
            {/if}
            <button
                onclick={clearFilter}
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline cursor-pointer">Clear</button
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
