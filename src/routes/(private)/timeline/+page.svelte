<script>
    import TimelineEventsTable from "./_components/TimelineEventsTable.svelte";

    let { data, form } = $props();

    /** @type {ReturnType<typeof TimelineEventsTable> | undefined} */
    let table = $state();

    // Local writable state resynced from data: inline edits/creates (remote
    // functions, no navigation) update it directly via onSaved; delete form
    // actions re-render the page and resync through the $effect below. It
    // cannot be a $derived because onSaved writes to it.
    /* eslint-disable svelte/prefer-writable-derived -- writable state resynced from props via $effect (see time-entries views) */
    let events = $state(data.events);

    $effect(() => {
        events = data.events;
    });
    /* eslint-enable svelte/prefer-writable-derived */

    /** @param {{ events: any[] }} result */
    function onSaved(result) {
        events = result.events;
    }
</script>

<svelte:head>
    <title>Life Events & Periods — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Life Events & Periods</h1>
    <p class="text-sm text-gray-500 mb-3.5 max-w-xl">
        Life events & periods capture high-level, manually entered context about your life — milestones (a single date)
        and periods (a date range, "→ present" if ongoing). Unlike <strong
            ><a href="../time-entries/">Time entries</a></strong
        >, which holds the fine-grained time-tracking data entry by entry, this timeline is a coarse-grained context
        layer, maintained by hand, to help you make sense of that data.
    </p>

    {#if form?.deleted}
        <p class="text-sm text-green-600 mb-3.5">Event deleted.</p>
    {/if}

    <div class="flex items-center gap-3 mb-2">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500">Timeline</h2>
        <button
            type="button"
            onclick={() => table?.startAdd()}
            class="text-sm text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
            >Add event</button
        >
    </div>
    <TimelineEventsTable
        {events}
        {onSaved}
        bind:this={table}
    />
</main>
