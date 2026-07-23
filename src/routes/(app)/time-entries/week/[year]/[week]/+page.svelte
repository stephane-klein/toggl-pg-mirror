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
    let periodLabel = $derived(data.periodLabel);
    let prevHref = $derived(data.prevHref);
    let prevLabel = $derived(data.prevLabel);
    let nextHref = $derived(data.nextHref);
    let nextLabel = $derived(data.nextLabel);
    let sort = $derived(data.sort);
    let total = $derived(data.total);
    let currentYear = $derived(data.currentYear);
    let currentWeek = $derived(data.currentWeek);
    let nearestNonEmptyHref = $derived(data.nearestNonEmptyHref);
    let nearestNonEmptyLabel = $derived(data.nearestNonEmptyLabel);
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
        activeMode: "week",
        modeDayHref: data.modeDayHref,
        modeWeekHref: data.modeWeekHref,
        modeMonthHref: data.modeMonthHref,
        rangeFromDayHref: data.rangeFromDayHref,
        rangeFromWeekHref: data.rangeFromWeekHref,
        rangeFromMonthHref: data.rangeFromMonthHref,
        rangeHref: data.rangeHref,
    });

    function handleKeydown(event) {
        if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT") return;
        if (event.key === "ArrowLeft" && prevHref) {
            event.preventDefault();
            goto(prevHref);
        } else if (event.key === "ArrowRight" && nextHref) {
            event.preventDefault();
            goto(nextHref);
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
    <title>{periodLabel} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo {...goToProps} />
        <div class="flex items-baseline gap-2">
            <ModeSelector {...modeProps} />
            <span class="text-gray-300">|</span>
            <LimitSelector mode="week" />
            <span class="text-gray-300">|</span>
            <SortToggle {sort} />
        </div>
    </div>

    <WeekNav
        {prevLabel}
        {prevHref}
        {nextLabel}
        {nextHref}
        {currentYear}
        {currentWeek}
        {nearestNonEmptyHref}
        {nearestNonEmptyLabel}
    />

    <FilterDescription {total} />

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
</main>
