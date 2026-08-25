<script>
    import { onMount } from "svelte";
    import { scaleBand } from "d3-scale";

    import { fmtDuration } from "$lib/backend/activity-chart-utils.js";
    import { cellOpacity } from "$lib/backend/activity-matrix.js";

    let { days = [], matrix = [] } = $props();

    const ROW_HEIGHT = 32;
    const MIN_CELL_WIDTH = 24;
    const margin = { top: 8, right: 8, bottom: 26, left: 96 };

    // Measured on the client once mounted (null during SSR): the wrapper div
    // width, so the matrix stretches across the full page width. The day
    // columns share the usable width; a period that fits fills the line, a
    // wider one (e.g. a whole year) keeps a minimum cell width and scrolls.
    let containerEl = $state();
    let containerWidth = $state(null);

    onMount(() => {
        const update = () => {
            containerWidth = containerEl?.clientWidth ?? 0;
        };
        update();
        const observer = new ResizeObserver(update);
        if (containerEl) observer.observe(containerEl);
        return () => observer.disconnect();
    });

    let cellWidth = $derived.by(() => {
        if (containerWidth === null) return MIN_CELL_WIDTH; // SSR default (first paint)
        const usable = containerWidth - margin.left - margin.right;
        return Math.max(MIN_CELL_WIDTH, Math.floor(usable / days.length));
    });

    let plotWidth = $derived(days.length * cellWidth);
    let plotHeight = $derived(matrix.length * ROW_HEIGHT);

    let xScale = $derived(scaleBand().domain(days).range([0, plotWidth]).padding(0.12));
    let yScale = $derived(
        scaleBand()
            .domain(matrix.map((row) => row.category.tag))
            .range([0, plotHeight])
            .padding(0.15),
    );

    function dayLabel(day) {
        const [y, m, d] = day.split("-").map(Number);
        const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
        return `${weekday} ${String(d).padStart(2, "0")}`;
    }

    // Two-line X-axis label: day number on top, weekday below (e.g. "09" / "Fri").
    function dayParts(day) {
        const [y, m, d] = day.split("-").map(Number);
        return {
            num: String(d).padStart(2, "0"),
            weekday: new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" }),
        };
    }
</script>

{#if days.length === 0}
    <p class="text-sm text-gray-500 mt-2">No days in period.</p>
{:else if matrix.length === 0}
    <section class="mt-8">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Activity matrix</h2>
        <p class="text-sm text-gray-500 mt-2">
            No activity matrix categories configured yet.
            <a
                href="/my/profile/"
                class="text-blue-600 hover:underline">Configure your activity matrix in your profile</a
            >.
        </p>
    </section>
{:else}
    <section class="mt-8">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Activity matrix</h2>
        <div
            class="overflow-x-auto"
            bind:this={containerEl}
            style="overflow-y: visible"
        >
            <svg
                width={plotWidth + margin.left + margin.right}
                height={plotHeight + margin.top + margin.bottom}
                overflow="visible"
                role="img"
                aria-label="Activity matrix"
            >
                <g transform="translate({margin.left},{margin.top})">
                    <!-- Y axis: category rows -->
                    {#each matrix as row (row.category.tag)}
                        <text
                            x="-8"
                            y={yScale(row.category.tag) + yScale.bandwidth() / 2 + 4}
                            text-anchor="end"
                            font-size="11"
                            fill="currentColor"
                        >
                            {row.category.label}
                        </text>
                    {/each}

                    <!-- X axis: day columns, two-line labels (day number / weekday) -->
                    {#each days as day (day)}
                        {@const parts = dayParts(day)}
                        <text
                            x={xScale(day) + xScale.bandwidth() / 2}
                            y={plotHeight + 13}
                            text-anchor="middle"
                            font-size="11"
                            fill="currentColor"
                        >
                            {parts.num}
                        </text>
                        <text
                            x={xScale(day) + xScale.bandwidth() / 2}
                            y={plotHeight + 24}
                            text-anchor="middle"
                            font-size="10"
                            fill="currentColor"
                            opacity="0.75"
                        >
                            {parts.weekday}
                        </text>
                    {/each}

                    <!-- Cells: one per (category, day), zero cells included -->
                    {#each matrix as row (row.category.tag)}
                        {#each row.cells as cell (row.category.tag + ":" + cell.day)}
                            {@const has = cell.count > 0}
                            {@const x = xScale(cell.day)}
                            {@const y = yScale(row.category.tag)}
                            <g role="presentation">
                                <rect
                                    {x}
                                    {y}
                                    width={xScale.bandwidth()}
                                    height={yScale.bandwidth()}
                                    rx="3"
                                    fill={has ? row.category.color : "currentColor"}
                                    fill-opacity={has ? cellOpacity(cell.count) : 0.08}
                                />
                                {#if has}
                                    <text
                                        x={x + xScale.bandwidth() / 2}
                                        y={y + yScale.bandwidth() / 2 - 1}
                                        text-anchor="middle"
                                        font-size="11"
                                        font-weight="600"
                                        fill="#fff"
                                    >
                                        {cell.count}
                                    </text>
                                    <text
                                        x={x + xScale.bandwidth() / 2}
                                        y={y + yScale.bandwidth() / 2 + 10}
                                        text-anchor="middle"
                                        font-size="8"
                                        fill="#fff"
                                        opacity="0.85"
                                    >
                                        {fmtDuration(cell.durationHours)}
                                    </text>
                                    <title
                                        >{row.category.label} — {dayLabel(cell.day)} : {cell.count} fois ({fmtDuration(
                                            cell.durationHours,
                                        )})</title
                                    >
                                {/if}
                            </g>
                        {/each}
                    {/each}
                </g>
            </svg>
        </div>
    </section>
{/if}
