<script>
    import { goto } from "$app/navigation";
    import ModeSelector from "$lib/components/ModeSelector.svelte";
    import GoTo from "$lib/components/GoTo.svelte";
    import SortToggle from "../../../_components/SortToggle.svelte";
    import LimitSelector from "../../../_components/LimitSelector.svelte";
    import WeekNav from "$lib/components/nav/WeekNav.svelte";
    import TimeEntryFilter from "../../../_components/TimeEntryFilter.svelte";
    import BulkEditPanel from "../../../_components/BulkEditPanel.svelte";
    import BulkEditUndoStatus from "../../../_components/BulkEditUndoStatus.svelte";
    import TimeEntriesTable from "../../../_components/TimeEntriesTable.svelte";
    import Pagination from "../../../_components/Pagination.svelte";

    let { data } = $props();
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let entries = $state(data.entries);
    let periodLabel = $derived(data.periodLabel);
    let prevHref = $derived(data.prevHref);
    let prevLabel = $derived(data.prevLabel);
    let nextHref = $derived(data.nextHref);
    let nextLabel = $derived(data.nextLabel);
    let sort = $derived(data.sort);
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let total = $state(data.total);
    let currentYear = $derived(data.currentYear);
    let currentWeek = $derived(data.currentWeek);
    let nearestNonEmptyHref = $derived(data.nearestNonEmptyHref);
    let nearestNonEmptyLabel = $derived(data.nearestNonEmptyLabel);
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let prevPageHref = $state(data.prevPageHref);
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let nextPageHref = $state(data.nextPageHref);
    let hasFilter = $derived(data.hasFilter);
    let view = $derived(data.view);
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let selectedIds = $state(new Set(data.selectedIds));
    // svelte-ignore state_referenced_locally (writable state resynced from props via $effect)
    let selectAllMatching = $state(data.selectAllMatching);

    $effect(() => {
        entries = data.entries;
        selectedIds = new Set(data.selectedIds);
        selectAllMatching = data.selectAllMatching;
        total = data.total;
        prevPageHref = data.prevPageHref;
        nextPageHref = data.nextPageHref;
    });

    /** @param {{ entries: any[], total: number, prevPageHref: string | null, nextPageHref: string | null }} result */
    function onSaved(result) {
        entries = result.entries;
        total = result.total;
        prevPageHref = result.prevPageHref;
        nextPageHref = result.nextPageHref;
    }

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
        if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT" || event.target.isContentEditable)
            return;
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
    {#if selectedIds.size >= 2 || (selectAllMatching && total > 0)}
        <BulkEditPanel
            {entries}
            {view}
            bind:selectedIds
            bind:selectAllMatching
        />
    {:else}
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
            basePath="/time-entries"
            {prevLabel}
            {prevHref}
            {nextLabel}
            {nextHref}
            {currentYear}
            {currentWeek}
            {nearestNonEmptyHref}
            {nearestNonEmptyLabel}
        />

        <TimeEntryFilter {total} />
    {/if}

    <BulkEditUndoStatus />

    <TimeEntriesTable
        {entries}
        bind:selectedIds
        bind:selectAllMatching
        {sort}
        {prevPageHref}
        {nextPageHref}
        {total}
        {hasFilter}
        {view}
        {onSaved}
    />
    <Pagination
        {prevPageHref}
        {nextPageHref}
        {entries}
        {sort}
    />
</main>
