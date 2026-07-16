<script>
    /* eslint-disable svelte/prefer-svelte-reactivity -- new Date() used for default links, not reactive state */

    let { activeMode = "day", sort = "" } = $props();

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);

    const jan4 = new Date(now.getFullYear(), 0, 4);
    const dow = jan4.getDay();
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (dow === 0 ? 6 : dow - 1));
    const currentWeek = Math.ceil(((now - mondayOfWeek1) / 86400000 + mondayOfWeek1.getDay() + 1) / 7);
    const currentYear = now.getFullYear();

    const qs = $derived(sort ? `?sort=${sort}` : "");
</script>

<nav class="text-[13px]">
    View 1
    <a
        href="/time-entries/day/{today}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "day"}
        class:text-gray-900={activeMode === "day"}>Day</a
    >
    <span class="text-gray-300">·</span>
    <a
        href="/time-entries/week/{currentYear}/{currentWeek}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "week"}
        class:text-gray-900={activeMode === "week"}>Week</a
    >
    <span class="text-gray-300">·</span>
    <a
        href="/time-entries/month/{currentMonth}{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "month"}
        class:text-gray-900={activeMode === "month"}>Month</a
    >
    <span class="text-gray-300">·</span>
    <a
        href="/time-entries/range{qs}"
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "range"}
        class:text-gray-900={activeMode === "range"}>Range</a
    >
</nav>
