<script>
    let { prevCursor, nextCursor, limit, baseQuery = "", entries = [], sort = "asc" } = $props();

    let allShown = $derived(!prevCursor && !nextCursor && entries.length > 0);

    let leftCursor = $derived(sort === "asc" ? nextCursor : prevCursor);
    let rightCursor = $derived(sort === "asc" ? prevCursor : nextCursor);
    let leftParam = $derived(sort === "asc" ? "before" : "after");
    let rightParam = $derived(sort === "asc" ? "after" : "before");
    let leftLabel = $derived(sort === "asc" ? "Older" : "Newer");
    let rightLabel = $derived(sort === "asc" ? "Newer" : "Older");
</script>

{#if allShown}
    <p class="text-gray-500 italic text-[13px] mt-4 text-right">All entries displayed.</p>
{:else if prevCursor || nextCursor}
        <nav class="flex items-center gap-3 mt-4 text-[12px] justify-end">
        <span class="text-[11px] text-gray-400">Page</span>
        {#if leftCursor}
            <a
                href="?{baseQuery
                    ? `${baseQuery}&limit=${limit}&${leftParam}=${leftCursor}`
                    : `limit=${limit}&${leftParam}=${leftCursor}`}"
                class="text-blue-600 no-underline hover:underline">‹ {leftLabel}</a
            >
        {:else}
            <span class="text-gray-400">‹ {leftLabel}</span>
        {/if}
        <span class="text-gray-300">·</span>
        {#if rightCursor}
            <a
                href="?{baseQuery
                    ? `${baseQuery}&limit=${limit}&${rightParam}=${rightCursor}`
                    : `limit=${limit}&${rightParam}=${rightCursor}`}"
                class="text-blue-600 no-underline hover:underline">{rightLabel} ›</a
            >
        {:else}
            <span class="text-gray-400">{rightLabel} ›</span>
        {/if}
    </nav>
{/if}
