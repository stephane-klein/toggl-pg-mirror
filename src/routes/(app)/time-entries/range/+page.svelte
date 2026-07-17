<script>
    import ModeSelector from "../_components/ModeSelector.svelte";
    import GoTo from "../_components/GoTo.svelte";
    import SortToggle from "../_components/SortToggle.svelte";
    import LimitSelector from "../_components/LimitSelector.svelte";
    import RangeNav from "../_components/nav/RangeNav.svelte";
    import TimeEntriesTable from "../_components/TimeEntriesTable.svelte";
    import Pagination from "../_components/Pagination.svelte";

    let { data } = $props();
    let entries = $derived(data.entries);
    let prevCursor = $derived(data.prevCursor);
    let nextCursor = $derived(data.nextCursor);
    let limit = $derived(data.limit);
    let periodLabel = $derived(data.periodLabel);
    let sort = $derived(data.sort);
    let currentFrom = $derived(data.currentFrom);
    let currentTo = $derived(data.currentTo);
</script>

<svelte:head>
    <title>{periodLabel || "Range"} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-7 pb-24">
    <div class="flex items-baseline justify-between mb-4 flex-wrap gap-y-1">
        <GoTo {sort} />
        <div class="flex items-baseline gap-2">
            <ModeSelector
                activeMode="range"
                {sort}
            />
            <span class="text-gray-300">|</span>
            <LimitSelector
                mode="range"
                baseQuery="from={currentFrom}&to={currentTo}&sort={sort}"
            />
            <span class="text-gray-300">|</span>
            <SortToggle {sort} />
        </div>
    </div>

    <RangeNav
        {currentFrom}
        {currentTo}
        {sort}
    />

    {#if periodLabel}
        <TimeEntriesTable {entries} />
        <Pagination
            {prevCursor}
            {nextCursor}
            {limit}
            {entries}
            baseQuery="from={currentFrom}&to={currentTo}&sort={sort}"
        />
    {:else}
        <p class="text-gray-500 italic py-6">Select a date range above.</p>
    {/if}
</main>
