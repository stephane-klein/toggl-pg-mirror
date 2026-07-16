<script>
    import TimeEntriesTable from "./_components/TimeEntriesTable.svelte";
    import Pagination from "./_components/Pagination.svelte";
    import LimitSelector from "./_components/LimitSelector.svelte";

    let { data } = $props();
    let entries = $derived(data.entries);
    let prevCursor = $derived(data.prevCursor);
    let nextCursor = $derived(data.nextCursor);
    let limit = $derived(data.limit);
</script>

<svelte:head>
    <title>Time entries — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-7 pb-24">
    <div class="flex items-baseline justify-between mb-5 flex-wrap gap-y-1">
        <h1 class="text-xl font-bold tracking-tight">Time entries</h1>
        <LimitSelector
            {limit}
            baseQuery=""
        />
    </div>

    <TimeEntriesTable {entries} />
    <Pagination
        {prevCursor}
        {nextCursor}
        {limit}
        baseQuery=""
    />
</main>
