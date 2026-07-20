<script>
    /* eslint-disable svelte/prefer-svelte-reactivity -- Date values used for default links, not reactive state */

    let { activeMode = "day", sort = "", referenceDate = undefined } = $props();

    const refDate = $derived(referenceDate ? new Date(referenceDate + "T00:00:00") : new Date());
    const today = $derived(refDate.toISOString().split("T")[0]);
    const currentMonth = $derived(today.slice(0, 7));

    const currentYear = $derived.by(() => {
        const isoDow = ((refDate.getDay() + 6) % 7) + 1;
        const thursday = new Date(refDate);
        thursday.setDate(refDate.getDate() - isoDow + 4);
        return thursday.getFullYear();
    });

    const currentWeek = $derived.by(() => {
        const isoDow = ((refDate.getDay() + 6) % 7) + 1;
        const thursday = new Date(refDate);
        thursday.setDate(refDate.getDate() - isoDow + 4);
        const jan1 = new Date(currentYear, 0, 1);
        const days = Math.round((thursday - jan1) / 86400000);
        return Math.ceil((days + jan1.getDay() + 1) / 7);
    });

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function addDays(dateStr, n) {
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + n);
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    const rangeHref = $derived.by(() => {
        if (activeMode === "range") {
            return `/time-entries/range${sort ? `?sort=${sort}` : ""}`;
        }
        const from = today;
        let to;
        if (activeMode === "week") {
            to = addDays(today, 6);
        } else if (activeMode === "month") {
            const [y, m] = currentMonth.split("-").map(Number);
            to = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
        } else {
            to = today;
        }
        const params = `from=${from}&to=${to}`;
        return `/time-entries/range${sort ? `?${params}&sort=${sort}` : `?${params}`}`;
    });

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
        href={rangeHref}
        class="text-gray-500 no-underline hover:text-blue-600 hover:underline"
        class:font-bold={activeMode === "range"}
        class:text-gray-900={activeMode === "range"}>Range</a
    >
</nav>
