<script>
    import ModeSelector from "../_components/ModeSelector.svelte";
    import GoTo from "../_components/GoTo.svelte";
    import SortToggle from "../_components/SortToggle.svelte";
    import LimitSelector from "../_components/LimitSelector.svelte";
    import RangeNav from "../_components/nav/RangeNav.svelte";
    import FilterDescription from "../_components/FilterDescription.svelte";
    import TimeEntriesTable from "../_components/TimeEntriesTable.svelte";
    import Pagination from "../_components/Pagination.svelte";

    let { data } = $props();
    let entries = $derived(data.entries);
    let prevCursor = $derived(data.prevCursor);
    let nextCursor = $derived(data.nextCursor);
    let limit = $derived(data.limit);
    let periodLabel = $derived(data.periodLabel);
    let sort = $derived(data.sort);
    let q = $derived(data.q);
    let total = $derived(data.total);
    let currentFrom = $derived(data.currentFrom);

    let currentTo = $derived(data.currentTo);
    const referenceDate = currentFrom || new Date().toISOString().split("T")[0];
    let todayHasEntries = $derived(data.todayHasEntries);
    let firstNonEmptyDayUrl = $derived(data.firstNonEmptyDayUrl);
    let firstNonEmptyDayLabel = $derived(data.firstNonEmptyDayLabel);
    let thisWeekHasEntries = $derived(data.thisWeekHasEntries);
    let firstNonEmptyWeekUrl = $derived(data.firstNonEmptyWeekUrl);
    let firstNonEmptyWeekLabel = $derived(data.firstNonEmptyWeekLabel);
    let thisMonthHasEntries = $derived(data.thisMonthHasEntries);
    let firstNonEmptyMonthUrl = $derived(data.firstNonEmptyMonthUrl);
    let firstNonEmptyMonthLabel = $derived(data.firstNonEmptyMonthLabel);
</script>

<svelte:head>
    <title>{periodLabel || "Range"} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo
            {sort}
            {todayHasEntries}
            {firstNonEmptyDayUrl}
            {firstNonEmptyDayLabel}
            {thisWeekHasEntries}
            {firstNonEmptyWeekUrl}
            {firstNonEmptyWeekLabel}
            {thisMonthHasEntries}
            {firstNonEmptyMonthUrl}
            {firstNonEmptyMonthLabel}
        />
        <div class="flex items-baseline gap-2">
            <ModeSelector
                activeMode="range"
                {sort}
                {referenceDate}
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
        {q}
    />

    <FilterDescription {total} />

    {#if periodLabel}
        <TimeEntriesTable
            {entries}
            {sort}
            {prevCursor}
            {nextCursor}
            {limit}
            baseQuery="from={currentFrom}&to={currentTo}&sort={sort}&q={q}"
        />
        <Pagination
            {prevCursor}
            {nextCursor}
            {limit}
            {entries}
            {sort}
            baseQuery="from={currentFrom}&to={currentTo}&sort={sort}&q={q}"
        />
    {:else}
        <p class="text-gray-500 italic py-6">Select a date range above.</p>
    {/if}
</main>
