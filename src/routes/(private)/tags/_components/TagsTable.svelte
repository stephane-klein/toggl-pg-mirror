<script>
    import { formatHumanDuration } from "$lib/shared/format-duration.js";

    let { data } = $props();

    let nameHref = $derived(data.nameHref);
    let countHref = $derived(data.countHref);
    let durationHref = $derived(data.durationHref);
    let sort = $derived(data.sort);
</script>

{#if data.tags.length === 0}
    <p class="text-sm text-gray-500 italic">No tags in this period.</p>
{:else}
    <table class="w-full text-sm border-collapse max-w-xl">
        <thead>
            <tr class="text-left text-gray-500 border-b border-gray-300">
                <th class="pb-2 pr-4 font-semibold">
                    <a
                        href={nameHref}
                        class="no-underline hover:underline text-inherit whitespace-nowrap"
                    >
                        Tag{sort.column === "name" ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                    </a>
                </th>
                <th class="pb-2 text-right font-semibold">
                    <a
                        href={countHref}
                        class="no-underline hover:underline text-inherit whitespace-nowrap"
                    >
                        Entries{sort.column === "count" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                    </a>
                </th>
                <th class="pb-2 pr-4 text-right font-semibold">
                    <a
                        href={durationHref}
                        class="no-underline hover:underline text-inherit whitespace-nowrap"
                    >
                        Duration{sort.column === "duration" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                    </a>
                </th>
            </tr>
        </thead>
        <tbody>
            {#each data.tags as tag (tag.name)}
                <tr class="border-b border-gray-200">
                    <td class="py-2 pr-4">
                        <code class="text-sm">{tag.name}</code>
                    </td>
                    <td class="py-2 text-right">{tag.entry_count}</td>
                    <td class="py-2 pl-8 pr-4 text-right whitespace-nowrap">
                        {formatHumanDuration(tag.duration_hours * 3600)}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
