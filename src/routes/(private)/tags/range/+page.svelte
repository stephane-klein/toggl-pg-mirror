<script>
    import GoTo from "$lib/components/GoTo.svelte";
    import ModeSelector from "$lib/components/ModeSelector.svelte";
    import RangeNav from "$lib/components/nav/RangeNav.svelte";
    import TagsTable from "../_components/TagsTable.svelte";

    let { data } = $props();

    let goToProps = $derived({
        goToDayHref: data.goToDayHref,
        goToWeekHref: data.goToWeekHref,
        goToMonthHref: data.goToMonthHref,
        goToYearHref: data.goToYearHref,
        todayHasEntries: true,
        firstNonEmptyDayHref: null,
        firstNonEmptyDayLabel: "",
        thisWeekHasEntries: true,
        firstNonEmptyWeekHref: null,
        firstNonEmptyWeekLabel: "",
        thisMonthHasEntries: true,
        firstNonEmptyMonthHref: null,
        firstNonEmptyMonthLabel: "",
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
    <title>{data.periodLabel || "Range"} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo {...goToProps} />
        <ModeSelector {...modeProps} />
    </div>

    <RangeNav
        basePath="/tags"
        currentFrom={data.currentFrom}
        currentTo={data.currentTo}
    />

    <TagsTable {data} />
</main>
