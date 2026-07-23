<script>
    import { goto } from "$app/navigation";
    import ModeSelector from "../../../_components/ModeSelector.svelte";
    import GoTo from "../../../_components/GoTo.svelte";
    import SortToggle from "../../../_components/SortToggle.svelte";
    import LimitSelector from "../../../_components/LimitSelector.svelte";
    import WeekNav from "../../../_components/nav/WeekNav.svelte";
    import FilterDescription from "../../../_components/FilterDescription.svelte";
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
    let q = $derived(data.q);
    let total = $derived(data.total);
    let currentYear = $derived(data.currentYear);

    let currentWeek = $derived(data.currentWeek);
    let referenceDate = $derived(data.referenceDate);
    let nearestNonEmptyUrl = $derived(data.nearestNonEmptyUrl);
    let nearestNonEmptyLabel = $derived(data.nearestNonEmptyLabel);
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

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo
            {sort}
            {q}
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
                activeMode="week"
                {sort}
                {q}
                {referenceDate}
            />
            <span class="text-gray-300">|</span>
            <LimitSelector
                mode="week"
                baseQuery="year={currentYear}&week={currentWeek}&sort={sort}&q={q}"
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
        {q}
    />

    <FilterDescription {total} />

    <TimeEntriesTable
        {entries}
        {sort}
        {prevCursor}
        {nextCursor}
        {limit}
        baseQuery="year={currentYear}&week={currentWeek}&sort={sort}&q={q}"
    />
    <Pagination
        {prevCursor}
        {nextCursor}
        {limit}
        {entries}
        {sort}
        baseQuery="year={currentYear}&week={currentWeek}&sort={sort}&q={q}"
    />
</main>
