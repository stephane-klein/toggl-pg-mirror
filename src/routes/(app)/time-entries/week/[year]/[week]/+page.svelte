<script>
    import { goto } from "$app/navigation";
    import ModeSelector from "../../../_components/ModeSelector.svelte";
    import GoTo from "../../../_components/GoTo.svelte";
    import SortToggle from "../../../_components/SortToggle.svelte";
    import LimitSelector from "../../../_components/LimitSelector.svelte";
    import WeekNav from "../../../_components/nav/WeekNav.svelte";
    import TimeEntriesTable from "../../../_components/TimeEntriesTable.svelte";
    import Pagination from "../../../_components/Pagination.svelte";

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
    let sort = $derived(data.sort);
    let currentYear = $derived(data.currentYear);
    let currentWeek = $derived(data.currentWeek);
    let nearestNonEmptyUrl = $derived(data.nearestNonEmptyUrl);
    let nearestNonEmptyLabel = $derived(data.nearestNonEmptyLabel);

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
        <GoTo {sort} />
        <div class="flex items-baseline gap-2">
            <ModeSelector activeMode="week" {sort} />
            <span class="text-gray-300">|</span>
            <LimitSelector
                {limit}
                baseQuery="year={currentYear}&week={currentWeek}&sort={sort}"
            />
            <span class="text-gray-300">|</span>
            <SortToggle {sort} />
        </div>
    </div>

    <WeekNav
        prevLabel={prevPeriodLabel}
        prevUrl={prevPeriodUrl}
        nextLabel={nextPeriodLabel}
        nextUrl={nextPeriodUrl}
        {currentYear}
        {currentWeek}
        {nearestNonEmptyUrl}
        {nearestNonEmptyLabel}
        {sort}
    />

    <TimeEntriesTable {entries} />
    <Pagination
        {prevCursor}
        {nextCursor}
        {limit}
        baseQuery="year={currentYear}&week={currentWeek}&sort={sort}"
    />
</main>
