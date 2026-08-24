<script>
    import GoTo from "$lib/components/GoTo.svelte";
    import ModeSelector from "$lib/components/ModeSelector.svelte";
    import DayNav from "$lib/components/nav/DayNav.svelte";
    import ChartsPlaceholder from "../../_components/ChartsPlaceholder.svelte";

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
        activeMode: "day",
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
    <title>{data.periodLabel} — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-2 pb-12">
    <div class="flex items-baseline justify-between mb-2 flex-wrap gap-y-1">
        <GoTo {...goToProps} />
        <ModeSelector {...modeProps} />
    </div>

    <DayNav
        basePath="/charts"
        prevLabel={data.prevLabel}
        prevHref={data.prevHref}
        nextLabel={data.nextLabel}
        nextHref={data.nextHref}
        currentDate={data.currentDate}
    />

    <ChartsPlaceholder
        mode={data.mode}
        periodLabel={data.periodLabel}
    />
</main>
