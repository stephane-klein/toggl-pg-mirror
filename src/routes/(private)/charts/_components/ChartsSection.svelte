<script>
    import { onMount } from "svelte";

    import { computeDayColumns } from "$lib/shared/chart-day-columns.js";

    import TimelineGantt from "./TimelineGantt.svelte";
    import ActivityMatrix from "./ActivityMatrix.svelte";
    import ActivityChart from "./ActivityChart.svelte";

    let { periods = [], days = [], segments = [], matrix = [] } = $props();

    // A single container measurement shared by all three charts. Each chart
    // receives the same cellWidth, so their day columns are guaranteed to line
    // up (no independent ResizeObserver that could race during hydration).
    let chartsWrapEl = $state();
    let chartsWidth = $state(null);

    onMount(() => {
        const update = () => {
            chartsWidth = chartsWrapEl?.clientWidth ?? 0;
        };
        update();
        const observer = new ResizeObserver(update);
        if (chartsWrapEl) observer.observe(chartsWrapEl);
        return () => observer.disconnect();
    });

    let cellWidth = $derived(computeDayColumns(chartsWidth, days.length).cellWidth);
</script>

<div bind:this={chartsWrapEl}>
    <TimelineGantt
        {periods}
        {days}
        {cellWidth}
    />
    <ActivityMatrix
        {days}
        {matrix}
        {cellWidth}
    />
    <ActivityChart
        {days}
        {segments}
        {cellWidth}
    />
</div>
