<script>
    let { data } = $props();
</script>

<svelte:head>
    <title>Tags — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Tags</h1>

    {#if data.tags.length === 0}
        <p class="text-sm text-gray-500">No tags yet.</p>
    {/if}

    {#if data.tags.length > 0}
        <table class="w-full text-sm border-collapse max-w-md">
            <thead>
                <tr class="text-left text-gray-500 border-b border-gray-300">
                    <th class="pb-2 pr-4 font-semibold">Tag</th>
                    <th class="pb-2 text-right font-semibold">Entries</th>
                </tr>
            </thead>
            <tbody>
                {#each data.tags as tag (tag.name)}
                    <tr class="border-b border-gray-200">
                        <td class="py-2 pr-4">
                            <code class="text-sm">{tag.name}</code>
                        </td>
                        <td class="py-2 text-right">{tag.entry_count}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</main>
