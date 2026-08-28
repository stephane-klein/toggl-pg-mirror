<script>
    import { scaleBand } from "d3-scale";

    import { buildTimelineGantt } from "$lib/shared/timeline-gantt.js";
    import { DAY_CHART_LEFT_GUTTER, DAY_CHART_RIGHT_MARGIN, DAY_SCALE_PADDING } from "$lib/shared/chart-day-columns.js";

    let { periods = [], days = [], cellWidth = 24 } = $props();

    const LANE_HEIGHT = 34;
    const LANE_GAP = 6;
    const margin = { top: 8, right: DAY_CHART_RIGHT_MARGIN, bottom: 8, left: DAY_CHART_LEFT_GUTTER };

    function ts(dateStr) {
        return new Date(dateStr + "T00:00:00").getTime();
    }

    function addDays(dateStr, n) {
        const d = new Date(ts(dateStr) + n * 86400000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    }

    const from = $derived(days[0] ?? "");
    const to = $derived(days.length ? addDays(days[days.length - 1], 1) : "");
    const fromTime = $derived(from ? ts(from) : 0);

    // Day offset (integer) of a date string relative to the window start.
    function dayIndex(dateStr) {
        return Math.round((ts(dateStr) - fromTime) / 86400000);
    }

    let groups = $derived(buildTimelineGantt(periods, from, to));

    // One row per lane, with its precomputed y (categories are only told apart
    // by their bar color).
    let rows = $derived.by(() => {
        let y = 0;
        return groups.flatMap((group) =>
            group.lanes.map((lane, laneIndex) => {
                const row = { group, lane, laneIndex, y };
                y += LANE_HEIGHT + LANE_GAP;
                return row;
            }),
        );
    });

    // cellWidth comes from the page (shared with ActivityChart and
    // ActivityMatrix) so all charts line up day for day.
    let plotWidth = $derived(days.length * cellWidth);
    let plotHeight = $derived(Math.max(0, rows.length * LANE_HEIGHT + (rows.length - 1) * LANE_GAP));

    let xScale = $derived(scaleBand().domain(days).range([0, plotWidth]).padding(DAY_SCALE_PADDING));

    function truncate(text, max) {
        return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
    }

    function periodDates(p) {
        return p.ongoing ? `${p.start_date} →` : `${p.start_date} → ${p.end_date}`;
    }
</script>

{#if rows.length > 0}
    <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Life Periods</h2>
    <div
        class="overflow-x-auto"
        style="overflow-y: visible"
    >
        <svg
            width={margin.left + plotWidth + margin.right}
            height={margin.top + plotHeight + margin.bottom}
            overflow="visible"
            role="img"
            aria-label="Timeline periods"
        >
            <g transform="translate({margin.left},{margin.top})">
                {#each rows as row (row.group.category + "-" + row.laneIndex)}
                    {#each row.lane as period (period.id)}
                        {@const startIdx = dayIndex(period.start)}
                        {@const endIdx = dayIndex(period.end)}
                        {@const x0 = xScale(days[startIdx])}
                        {@const x1 = xScale(days[endIdx - 1]) + xScale.bandwidth()}
                        {@const barWidth = x1 - x0}
                        <rect
                            x={x0}
                            y={row.y + 2}
                            width={Math.max(barWidth, 2)}
                            height={LANE_HEIGHT - 4}
                            rx="2"
                            fill={row.group.color}
                        />
                        {#if barWidth >= 60}
                            {@const titleChars = Math.floor((barWidth - 12) / 6.5)}
                            {@const datesChars = Math.floor((barWidth - 12) / 5.2)}
                            <text
                                x={x0 + 6}
                                y={row.y + 15}
                                font-size="11"
                                fill="#fff"
                            >
                                {truncate(period.title, titleChars)}
                            </text>
                            <text
                                x={x0 + 6}
                                y={row.y + 26}
                                font-size="9"
                                fill="#fff"
                                opacity="0.85"
                            >
                                {truncate(periodDates(period), datesChars)}
                            </text>
                        {/if}
                        {#if period.ongoing && barWidth >= 16}
                            <text
                                x={x1 - 3}
                                y={row.y + LANE_HEIGHT / 2 + 4}
                                text-anchor="end"
                                font-size="10"
                                fill="#fff"
                            >
                                →
                            </text>
                        {/if}
                    {/each}
                {/each}
            </g>
        </svg>
    </div>
{/if}
