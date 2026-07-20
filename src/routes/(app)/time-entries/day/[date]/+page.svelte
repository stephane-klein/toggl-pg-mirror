<script>
    import { goto } from "$app/navigation";
    import ModeSelector from "../../_components/ModeSelector.svelte";
    import GoTo from "../../_components/GoTo.svelte";
    import SortToggle from "../../_components/SortToggle.svelte";
    import LimitSelector from "../../_components/LimitSelector.svelte";
    import DayNav from "../../_components/nav/DayNav.svelte";
    import TimeEntriesTable from "../../_components/TimeEntriesTable.svelte";
    import Pagination from "../../_components/Pagination.svelte";

    let { data } = $props();
    let entries = $derived(data.entries);
    let prevCursor = $derived(data.prevCursor);
    let nextCursor = $derived(data.nextCursor);
    let limit = $derived(data.limit);
    let periodLabel = $derived(data.periodLabel);
    let prevPeriodUrl = $derived(data.prevPeriodUrl);
    let prevPeriodLabel = $derived(data.prevPeriodLabel);
    let nextPeriodUrl = $derived(data.nextPeriodUrl);
    let nextPeriodLabel = $derived(data.nextPeriodLabel);
    let nearestNonEmptyUrl = $derived(data.nearestNonEmptyUrl);
    let nearestNonEmptyLabel = $derived(data.nearestNonEmptyLabel);
    let sort = $derived(data.sort);
    let currentDate = $derived(data.currentDate);
    let todayHasEntries = $derived(data.todayHasEntries);
    let firstNonEmptyDayUrl = $derived(data.firstNonEmptyDayUrl);
    let firstNonEmptyDayLabel = $derived(data.firstNonEmptyDayLabel);
    let thisWeekHasEntries = $derived(data.thisWeekHasEntries);
    let firstNonEmptyWeekUrl = $derived(data.firstNonEmptyWeekUrl);
    let firstNonEmptyWeekLabel = $derived(data.firstNonEmptyWeekLabel);
    let thisMonthHasEntries = $derived(data.thisMonthHasEntries);
    let firstNonEmptyMonthUrl = $derived(data.firstNonEmptyMonthUrl);
    let firstNonEmptyMonthLabel = $derived(data.firstNonEmptyMonthLabel);

    function handleKeydown(event) {
        if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT") return;
        if (event.key === "ArrowLeft" && prevPeriodUrl) {
            event.preventDefault();
            goto(prevPeriodUrl);
        } else if (event.key === "ArrowRight" && nextPeriodUrl) {
            event.preventDefault();
            goto(nextPeriodUrl);
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
    <title>{periodLabel} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-7 pb-24">
    <div class="flex items-baseline justify-between mb-4 flex-wrap gap-y-1">
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
                activeMode="day"
                {sort}
                referenceDate={currentDate}
            />
            <span class="text-gray-300">|</span>
            <LimitSelector
                mode="day"
                baseQuery="date={currentDate}&sort={sort}"
            />
            <span class="text-gray-300">|</span>
            <SortToggle {sort} />
        </div>
    </div>

    <DayNav
        prevLabel={prevPeriodLabel}
        prevUrl={prevPeriodUrl}
        nextLabel={nextPeriodLabel}
        nextUrl={nextPeriodUrl}
        {currentDate}
        {nearestNonEmptyUrl}
        {nearestNonEmptyLabel}
        {sort}
    />

    <TimeEntriesTable {entries} />
    <Pagination
        {prevCursor}
        {nextCursor}
        {limit}
        {entries}
        baseQuery="date={currentDate}&sort={sort}"
    />
</main>
