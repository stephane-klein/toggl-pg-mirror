<script>
    let { prevCursor, nextCursor, limit, baseQuery = "", entries = [] } = $props();

    let allShown = $derived(!prevCursor && !nextCursor && entries.length > 0);
</script>

{#if allShown}
    <p class="text-gray-500 italic text-[13px] mt-6">All entries displayed.</p>
{:else if prevCursor || nextCursor}
    <nav class="flex items-center gap-3 mt-6 text-[13px]">
        {#if prevCursor}
            <a
                href="?{baseQuery
                    ? `${baseQuery}&limit=${limit}&after=${prevCursor}`
                    : `limit=${limit}&after=${prevCursor}`}"
                class="text-blue-600 no-underline hover:underline">‹ Newer</a
            >
        {:else}
            <span class="text-gray-400">‹ Newer</span>
        {/if}
        <span class="text-gray-300">·</span>
        {#if nextCursor}
            <a
                href="?{baseQuery
                    ? `${baseQuery}&limit=${limit}&before=${nextCursor}`
                    : `limit=${limit}&before=${nextCursor}`}"
                class="text-blue-600 no-underline hover:underline">Older ›</a
            >
        {:else}
            <span class="text-gray-400">Older ›</span>
        {/if}
    </nav>
{/if}
