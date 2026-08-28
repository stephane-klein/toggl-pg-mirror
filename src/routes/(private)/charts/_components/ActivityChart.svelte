<script>
    import { scaleLinear, scaleBand } from "d3-scale";

    import { fmtTime, fmtDuration, DAY_START_HOUR } from "$lib/shared/activity-chart-utils.js";
    import { computeSleepStats } from "$lib/shared/sleep-stats.js";
    import { DAY_CHART_LEFT_GUTTER, DAY_CHART_RIGHT_MARGIN, DAY_SCALE_PADDING } from "$lib/shared/chart-day-columns.js";

    let { days = [], segments = [], cellWidth = 24, color = "#534AB7", chartHeight = 420 } = $props();

    const margin = { top: 8, right: DAY_CHART_RIGHT_MARGIN, bottom: 26, left: DAY_CHART_LEFT_GUTTER };

    // cellWidth comes from the page (shared with ActivityMatrix and
    // TimelineGantt) so all charts line up day for day.
    let plotWidth = $derived(days.length * cellWidth);
    let plotHeight = $derived(chartHeight);

    // The Y axis extends beyond 24h so that the sleep bar can stretch from
    // bedtime to wake-up time in one continuous block (no wrap/split).
    // Max offset = max(seg.end) - DAY_START_HOUR across all segments,
    // with a floor of 26 so the axis always shows at least 6h past the start.
    let yMax = $derived(Math.max(26, ...segments.map((s) => s.end - DAY_START_HOUR)));

    let yScale = $derived(scaleLinear().domain([0, yMax]).range([0, plotHeight]));
    let xScale = $derived(scaleBand().domain(days).range([0, plotWidth]).padding(DAY_SCALE_PADDING));

    // Graduations every 2h, labelled with the real hour: 4h, 6h, …, 0h, 2h, 4h, 6h, 8h…
    let yTicks = $derived(
        Array.from({ length: Math.floor(yMax / 2) + 1 }, (_, i) => i * 2).map((offset) => ({
            offset,
            hour: (offset + DAY_START_HOUR) % 24,
        })),
    );

    function dayLabel(day) {
        const [y, m, d] = day.split("-").map(Number);
        const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
        return `${weekday} ${String(d).padStart(2, "0")}`;
    }

    let hoveredSeg = $state.raw(null);

    // Wake-up time per day: the longest sleep segment of that day (there can be
    // several entries, e.g. a short nap plus the main night).
    let wakeTimes = $derived(
        Object.values(
            segments.reduce((acc, seg) => {
                const dur = seg.end - seg.start;
                const prev = acc[seg.day];
                if (!prev || dur > prev.dur) {
                    acc[seg.day] = { day: seg.day, start: seg.start, end: seg.end, dur };
                }
                return acc;
            }, {}),
        ),
    );

    // Weekly/monthly sleep statistics over the main nights only (median + std
    // dev of bedtime/wake/duration, plus min/max duration). Null on the day
    // view or when fewer than 2 nights have data.
    let sleepStats = $derived(computeSleepStats(segments));
</script>

{#if days.length === 0}
    <p class="text-sm text-gray-500 mt-2">No days in period.</p>
{:else}
    <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mt-8 mb-2">Activity chart</h2>
    <div
        class="overflow-x-auto"
        style="overflow-y: visible"
    >
        <svg
            width={plotWidth + margin.left + margin.right}
            height={plotHeight + margin.top + margin.bottom}
            overflow="visible"
            role="img"
            aria-label="Activity chart"
        >
            <g transform="translate({margin.left},{margin.top})">
                <!-- Y axis: hours -->
                {#each yTicks as tick (tick.offset)}
                    <line
                        x1="0"
                        x2={plotWidth}
                        y1={yScale(tick.offset)}
                        y2={yScale(tick.offset)}
                        stroke="currentColor"
                        stroke-opacity="0.15"
                        stroke-dasharray="2 3"
                    />
                    <text
                        x="-6"
                        y={yScale(tick.offset) + 4}
                        text-anchor="end"
                        font-size="11"
                        fill="currentColor"
                    >
                        {tick.hour}h
                    </text>
                {/each}

                <!-- X axis: day columns -->
                {#each days as day (day)}
                    <text
                        x={xScale(day) + xScale.bandwidth() / 2}
                        y={plotHeight + 18}
                        text-anchor="middle"
                        font-size="11"
                        fill="currentColor"
                    >
                        {dayLabel(day)}
                    </text>
                {/each}

                <!-- Sleep segments: one continuous bar per entry, no wrap -->
                {#each segments as seg (seg.day + "-" + seg.start)}
                    {@const y0 = seg.start - DAY_START_HOUR}
                    {@const y1 = seg.end - DAY_START_HOUR}
                    {@const barX = xScale(seg.day)}
                    {@const barWidth = xScale.bandwidth()}
                    <g
                        onmouseenter={() => (hoveredSeg = seg)}
                        onmouseleave={() => (hoveredSeg = null)}
                        role="presentation"
                    >
                        <rect
                            x={barX}
                            y={yScale(y0)}
                            width={barWidth}
                            height={Math.max(2, yScale(y1) - yScale(y0))}
                            rx="3"
                            fill={color}
                            opacity={hoveredSeg === seg ? 0.8 : 1}
                            style="transition: opacity 150ms"
                        />
                    </g>
                {/each}

                <!-- Sleep labels: bedtime, duration, wake-up (pointer-events none so hover stays on bar) -->
                {#each wakeTimes as w (w.day)}
                    {@const y0 = w.start - DAY_START_HOUR}
                    {@const y1 = w.end - DAY_START_HOUR}
                    {@const barTop = yScale(y0)}
                    {@const barBot = yScale(y1)}
                    {@const barMid = (barTop + barBot) / 2}
                    {@const longEnough = w.dur >= 4}
                    {#if longEnough}
                        <!-- Bedtime (top of bar) -->
                        <text
                            x={xScale(w.day) + xScale.bandwidth() / 2}
                            y={barTop + 14}
                            text-anchor="middle"
                            font-size="11"
                            fill="#fff"
                            stroke={color}
                            stroke-width="3"
                            stroke-linejoin="round"
                            paint-order="stroke"
                            pointer-events="none"
                        >
                            {fmtTime(w.start % 24)}
                        </text>
                        <!-- Duration label (center) -->
                        <text
                            x={xScale(w.day) + xScale.bandwidth() / 2}
                            y={barMid - 5}
                            text-anchor="middle"
                            font-size="9"
                            fill="#fff"
                            opacity="0.7"
                            pointer-events="none"
                        >
                            durée
                        </text>
                        <!-- Duration value (center) -->
                        <text
                            x={xScale(w.day) + xScale.bandwidth() / 2}
                            y={barMid + 9}
                            text-anchor="middle"
                            font-size="13"
                            fill="#fff"
                            stroke={color}
                            stroke-width="3"
                            stroke-linejoin="round"
                            paint-order="stroke"
                            pointer-events="none"
                        >
                            {fmtDuration(w.dur)}
                        </text>
                        <!-- Wake-up (bottom of bar) -->
                        <text
                            x={xScale(w.day) + xScale.bandwidth() / 2}
                            y={barBot - 6}
                            text-anchor="middle"
                            font-size="11"
                            fill="#fff"
                            stroke={color}
                            stroke-width="3"
                            stroke-linejoin="round"
                            paint-order="stroke"
                            pointer-events="none"
                        >
                            {fmtTime(w.end % 24)}
                        </text>
                    {:else}
                        <!-- Short sleep: duration only -->
                        <text
                            x={xScale(w.day) + xScale.bandwidth() / 2}
                            y={barMid + 4}
                            text-anchor="middle"
                            font-size="11"
                            fill="#fff"
                            stroke={color}
                            stroke-width="3"
                            stroke-linejoin="round"
                            paint-order="stroke"
                            pointer-events="none"
                        >
                            {fmtDuration(w.dur)}
                        </text>
                    {/if}
                {/each}

                <!-- Hover tooltip -->
                {#if hoveredSeg}
                    {@const tooltipY = Math.min(
                        Math.max(yScale(hoveredSeg.start - DAY_START_HOUR) - 8, 48),
                        plotHeight - 60,
                    )}
                    <g transform="translate({xScale(hoveredSeg.day) + xScale.bandwidth() / 2}, {tooltipY})">
                        <rect
                            x="-52"
                            y="-48"
                            width="104"
                            height="54"
                            rx="3"
                            fill="#fff"
                            stroke="#ddd"
                            stroke-width="1"
                        />
                        <text
                            x="0"
                            y="-32"
                            text-anchor="middle"
                            font-size="11"
                            fill="#1a1a1a"
                        >
                            couché {fmtTime(hoveredSeg.start % 24)}
                        </text>
                        <text
                            x="0"
                            y="-18"
                            text-anchor="middle"
                            font-size="11"
                            fill="#1a1a1a"
                        >
                            durée {fmtDuration(hoveredSeg.end - hoveredSeg.start)}
                        </text>
                        <text
                            x="0"
                            y="-4"
                            text-anchor="middle"
                            font-size="11"
                            fill="#1a1a1a"
                        >
                            levé {fmtTime(hoveredSeg.end % 24)}
                        </text>
                    </g>
                {/if}
            </g>
        </svg>
        <div
            class="flex items-center gap-1.5 mt-1 text-xs"
            style="color: #666"
        >
            <span
                class="inline-block"
                style="width: 12px; height: 12px; border-radius: 2px; background-color: {color}"
            ></span>
            Sommeil
        </div>
        {#if sleepStats}
            <div
                class="mt-2 text-xs leading-5"
                style="color: #666"
            >
                <p>Analyse du sommeil sur une période de <span class="font-mono">{sleepStats.n}</span> nuits.</p>
                <table class="border-collapse mt-1">
                    <thead>
                        <tr>
                            <th class="font-normal text-left pr-5"></th>
                            <th class="font-normal text-left pr-5">Médiane</th>
                            <th class="font-normal text-left pr-5">Moyenne</th>
                            <th class="font-normal text-left pr-5">Écart type</th>
                            <th class="font-normal text-left pr-5">P25</th>
                            <th class="font-normal text-left pr-5">P75</th>
                            <th class="font-normal text-left pr-5">Min</th>
                            <th class="font-normal text-left">Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th
                                scope="row"
                                class="font-normal text-left pr-5">Heure de couché</th
                            >
                            <td class="font-mono pr-5">{fmtTime(sleepStats.bedtime.median % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.bedtime.mean % 24)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.bedtime.stddev)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.bedtime.p25 % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.bedtime.p75 % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.bedtime.min % 24)}</td>
                            <td class="font-mono">{fmtTime(sleepStats.bedtime.max % 24)}</td>
                        </tr>
                        <tr>
                            <th
                                scope="row"
                                class="font-normal text-left pr-5">Heure de levé</th
                            >
                            <td class="font-mono pr-5">{fmtTime(sleepStats.wake.median % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.wake.mean % 24)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.wake.stddev)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.wake.p25 % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.wake.p75 % 24)}</td>
                            <td class="font-mono pr-5">{fmtTime(sleepStats.wake.min % 24)}</td>
                            <td class="font-mono">{fmtTime(sleepStats.wake.max % 24)}</td>
                        </tr>
                        <tr>
                            <th
                                scope="row"
                                class="font-normal text-left pr-5">Temps de sommeil</th
                            >
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.median)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.mean)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.stddev)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.p25)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.p75)}</td>
                            <td class="font-mono pr-5">{fmtDuration(sleepStats.duration.min)}</td>
                            <td class="font-mono">{fmtDuration(sleepStats.duration.max)}</td>
                        </tr>
                    </tbody>
                </table>
                <p class="mt-2">
                    <span class="font-semibold">Écart type</span> : mesure la dispersion des valeurs autour de la moyenne
                    ; plus la valeur est faible, plus le rythme est régulier.
                </p>
                <p>
                    <span class="font-semibold">P25</span> : un quart des nuits se situe à cette valeur ou plus tôt (couché,
                    levé) / ou moins (temps de sommeil).
                </p>
                <p>
                    <span class="font-semibold">P75</span> : les trois quarts des nuits se situent à cette valeur ou plus
                    tôt (couché, levé) / ou moins (temps de sommeil).
                </p>
            </div>
        {/if}
    </div>
{/if}
