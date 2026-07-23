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
    let periodLabel = $derived(data.periodLabel);
    let sort = $derived(data.sort);
    let total = $derived(data.total);
    let currentFrom = $derived(data.currentFrom);
    let currentTo = $derived(data.currentTo);
    let prevPageHref = $derived(data.prevPageHref);
    let nextPageHref = $derived(data.nextPageHref);

    let goToProps = $derived({
        goToDayHref: data.goToDayHref,
        goToWeekHref: data.goToWeekHref,
        goToMonthHref: data.goToMonthHref,
        goToYearHref: data.goToYearHref,
        todayHasEntries: data.todayHasEntries,
        firstNonEmptyDayHref: data.firstNonEmptyDayHref,
        firstNonEmptyDayLabel: data.firstNonEmptyDayLabel,
        thisWeekHasEntries: data.thisWeekHasEntries,
        firstNonEmptyWeekHref: data.firstNonEmptyWeekHref,
        firstNonEmptyWeekLabel: data.firstNonEmptyWeekLabel,
        thisMonthHasEntries: data.thisMonthHasEntries,
        firstNonEmptyMonthHref: data.firstNonEmptyMonthHref,
        firstNonEmptyMonthLabel: data.firstNonEmptyMonthLabel,
    });

    let modeProps = $derived({
        activeMode: "range",
        modeDayHref: data.modeDayHref,
        modeWeekHref: data.modeWeekHref,
        modeMonthHref: data.modeMonthHref,
        rangeFromDayHref: data.rangeFromDayHref,
        rangeFromWeekHref: data.rangeFromWeekHref,
        rangeFromMonthHref: data.rangeFromMonthHref,
        rangeHref: data.rangeHref,
    });
</script>

<svelte:head>
    <title>{periodLabel || "Range"} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo {...goToProps} />
        <div class="flex items-baseline gap-2">
            <ModeSelector {...modeProps} />
            <span class="text-gray-300">|</span>
            <LimitSelector mode="range" />
            <span class="text-gray-300">|</span>
            <SortToggle {sort} />
        </div>
    </div>

    <RangeNav
        {currentFrom}
        {currentTo}
    />

    <FilterDescription {total} />

    {#if periodLabel}
        <TimeEntriesTable
            {entries}
            {sort}
            {prevPageHref}
            {nextPageHref}
        />
        <Pagination
            {prevPageHref}
            {nextPageHref}
            {entries}
        />
    {:else}
        <p class="text-gray-500 italic py-6">Select a date range above.</p>
    {/if}
</main>
