<script>
    let { prevPageHref = null, nextPageHref = null, entries = [], sort = "asc" } = $props();

    let allShown = $derived(!prevPageHref && !nextPageHref && entries.length > 0);

    let leftLabel = $derived(sort === "asc" ? "Older" : "Newer");
    let rightLabel = $derived(sort === "asc" ? "Newer" : "Older");
</script>

{#if allShown}
    <p class="text-gray-500 italic text-[13px] mt-4 text-right">All entries displayed.</p>
{:else if prevPageHref || nextPageHref}
    <nav class="flex items-center gap-3 mt-4 text-[12px] justify-end">
        <span class="text-[11px] text-gray-400">Page</span>
        {#if prevPageHref}
            <a
                href={prevPageHref}
                class="text-blue-600 no-underline hover:underline">‹ {leftLabel}</a
            >
        {:else}
            <span class="text-gray-400">‹ {leftLabel}</span>
        {/if}
        <span class="text-gray-300">·</span>
        {#if nextPageHref}
            <a
                href={nextPageHref}
                class="text-blue-600 no-underline hover:underline">{rightLabel} ›</a
            >
        {:else}
            <span class="text-gray-400">{rightLabel} ›</span>
        {/if}
    </nav>
{/if}
