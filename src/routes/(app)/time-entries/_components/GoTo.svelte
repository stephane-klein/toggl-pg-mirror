<script>
    let {
        sort = "",
        q = "",
        todayHasEntries = true,
        firstNonEmptyDayUrl = "",
        thisWeekHasEntries = true,
        firstNonEmptyWeekUrl = "",
        thisMonthHasEntries = true,
        firstNonEmptyMonthUrl = "",
    } = $props();

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);

    const jan4 = new Date(now.getFullYear(), 0, 4);
    const dow = jan4.getDay();
    const mondayOfWeek1 = new Date(now.getFullYear(), 0, 4 - (dow === 0 ? 6 : dow - 1));
    const currentWeek = Math.ceil(((now - mondayOfWeek1) / 86400000 + mondayOfWeek1.getDay() + 1) / 7);
    const currentYear = now.getFullYear();

    const extraParams = $derived.by(() => {
        const p = [];
        if (sort) p.push(`sort=${sort}`);
        if (q) p.push(`q=${q}`);
        return p;
    });

    const qs = $derived(extraParams.length ? `?${extraParams.join("&")}` : "");
</script>

<nav class="text-[13px]">
    Go to
    <a
        href="/time-entries/day/{today}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Today</a
    >
    <span class="text-gray-300">|</span>
    <a
        href="/time-entries/week/{currentYear}/{currentWeek}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This week</a
    >
    <span class="text-gray-300">|</span>
    <a
        href="/time-entries/month/{currentMonth}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This month</a
    >
    <span class="text-gray-300">|</span>
    <a
        href="/time-entries/range?from={currentYear}-01-01&to={currentYear}-12-31{extraParams.length
            ? `&${extraParams.join('&')}`
            : ''}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline">This year</a
    >
    {#if !todayHasEntries && firstNonEmptyDayUrl}
        <span class="text-gray-300">|</span>
        <a
            href="{firstNonEmptyDayUrl}{qs}"
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline">First non-empty day</a
        >
    {/if}
    {#if !thisWeekHasEntries && firstNonEmptyWeekUrl}
        <span class="text-gray-300">|</span>
        <a
            href="{firstNonEmptyWeekUrl}{qs}"
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline">First non-empty week</a
        >
    {/if}
    {#if !thisMonthHasEntries && firstNonEmptyMonthUrl}
        <span class="text-gray-300">|</span>
        <a
            href="{firstNonEmptyMonthUrl}{qs}"
            class="text-gray-500 no-underline hover:text-blue-600 hover:underline">First non-empty month</a
        >
    {/if}
</nav>
