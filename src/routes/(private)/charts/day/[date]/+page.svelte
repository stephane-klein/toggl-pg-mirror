<script>
    import { goto } from "$app/navigation";
    import GoTo from "$lib/components/GoTo.svelte";
    import ModeSelector from "$lib/components/ModeSelector.svelte";
    import DayNav from "$lib/components/nav/DayNav.svelte";
    import ActivityChart from "../../_components/ActivityChart.svelte";

    let { data } = $props();

    let prevHref = $derived(data.prevHref);
    let nextHref = $derived(data.nextHref);

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

    <ActivityChart
        days={data.days}
        segments={data.segments}
    />
</main>
