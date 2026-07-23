<script>
    let {
        activeMode = "day",
        modeDayHref = "",
        modeWeekHref = "",
        modeMonthHref = "",
        rangeFromDayHref = "",
        rangeFromWeekHref = "",
        rangeFromMonthHref = "",
        rangeHref = "",
    } = $props();

    let activeRangeHref = $derived(
        activeMode === "day"
            ? rangeFromDayHref
            : activeMode === "week"
              ? rangeFromWeekHref
              : activeMode === "month"
                ? rangeFromMonthHref
                : rangeHref,
    );
</script>

<nav class="text-[13px]">
    View 1
    <a
        href={modeDayHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "day"}
        class:text-gray-900={activeMode === "day"}>Day</a
    >
    <span class="text-gray-300">·</span>
    <a
        href={modeWeekHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "week"}
        class:text-gray-900={activeMode === "week"}>Week</a
    >
    <span class="text-gray-300">·</span>
    <a
        href={modeMonthHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "month"}
        class:text-gray-900={activeMode === "month"}>Month</a
    >
    <span class="text-gray-300">·</span>
    <a
        href={activeRangeHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "range"}
        class:text-gray-900={activeMode === "range"}>Range</a
    >
</nav>
