<script>
    let {
        goToDayHref = "",
        goToWeekHref = "",
        goToMonthHref = "",
        goToYearHref = "",
        todayHasEntries = true,
        firstNonEmptyDayHref = null,
        firstNonEmptyDayLabel = "",
        thisWeekHasEntries = true,
        firstNonEmptyWeekHref = null,
        firstNonEmptyWeekLabel = "",
        thisMonthHasEntries = true,
        firstNonEmptyMonthHref = null,
        firstNonEmptyMonthLabel = "",
    } = $props();
</script>

<nav class="text-[13px]">
    Go to
    <a
        href={goToDayHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Today</a
    >
    <span class="text-gray-300">|</span>
    <a
        href={goToWeekHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This week</a
    >
    <span class="text-gray-300">|</span>
    <a
        href={goToMonthHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This month</a
    >
    <span class="text-gray-300">|</span>
    <a
        href={goToYearHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This year</a
    >
    {#if !todayHasEntries && firstNonEmptyDayHref}
        <span class="text-gray-300">|</span>
        <a
            href={firstNonEmptyDayHref}
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
            >{firstNonEmptyDayLabel || "First non-empty day"}</a
        >
    {/if}
    {#if !thisWeekHasEntries && firstNonEmptyWeekHref}
        <span class="text-gray-300">|</span>
        <a
            href={firstNonEmptyWeekHref}
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
            >{firstNonEmptyWeekLabel || "First non-empty week"}</a
        >
    {/if}
    {#if !thisMonthHasEntries && firstNonEmptyMonthHref}
        <span class="text-gray-300">|</span>
        <a
            href={firstNonEmptyMonthHref}
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
            >{firstNonEmptyMonthLabel || "First non-empty month"}</a
        >
    {/if}
</nav>
