<script>
    import { goto } from "$app/navigation";
    import DateInput from "$lib/components/DateInput.svelte";

    let {
        prevLabel = "",
        prevUrl = "",
        nextLabel = "",
        nextUrl = "",
        currentDate = "",
        nearestNonEmptyUrl = "",
        nearestNonEmptyLabel = "",
        currentYear = 0,
        currentWeek = 0,
        currentMonth = "",
        currentFrom = null,
        currentTo = null,
        sort = "",
    } = $props();

    function withSort(path) {
        if (!sort || !path) return path;
        return path.includes("?") ? `${path}&sort=${sort}` : `${path}?sort=${sort}`;
    }

    let weekInput = $state(String(currentWeek));
    let yearInput = $state(String(currentYear));
    let debounceTimer;

    $effect(() => {
        weekInput = String(currentWeek);
        yearInput = String(currentYear);
    });

    let monthYearInput = $state(currentMonth ? currentMonth.split("-")[0] : "");
    let monthNumInput = $state(currentMonth ? currentMonth.split("-")[1] : "");

    $effect(() => {
        if (currentMonth) {
            const [y, m] = currentMonth.split("-");
            monthYearInput = y;
            monthNumInput = m;
        }
    });

    let fromInput = $state(currentFrom ?? "");
    let toInput = $state(currentTo ?? "");

    $effect(() => {
        fromInput = currentFrom ?? "";
        toInput = currentTo ?? "";
    });

    let weekDateRange = $derived.by(() => {
        if (!currentYear || !currentWeek) return "";
        const jan4 = new Date(currentYear, 0, 4);
        const dow = jan4.getDay() || 7;
        const week1Monday = new Date(jan4);
        week1Monday.setDate(jan4.getDate() - (dow - 1));
        const monday = new Date(week1Monday);
        monday.setDate(week1Monday.getDate() + (currentWeek - 1) * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const sameMonth = monday.getMonth() === sunday.getMonth();
        const mondayOpts = sameMonth
            ? { weekday: "long", day: "numeric" }
            : { weekday: "long", day: "numeric", month: "long" };
        const sundayOpts = { weekday: "long", day: "numeric", month: "long" };
        return `From ${monday.toLocaleDateString("en-US", mondayOpts)} to ${sunday.toLocaleDateString("en-US", sundayOpts)}`;
    });

    let monthDateRange = $derived.by(() => {
        if (!currentMonth) return "";
        const [year, monthNum] = currentMonth.split("-").map(Number);
        const firstDay = new Date(year, monthNum - 1, 1);
        const lastDay = new Date(year, monthNum, 0);
        return `From ${firstDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })} to ${lastDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}`;
    });

    let rangeDateRange = $derived.by(() => {
        if (!currentFrom || !currentTo) return "";
        const from = new Date(currentFrom);
        const to = new Date(currentTo);
        const sameMonth = from.getMonth() === to.getMonth();
        const fromOpts = sameMonth
            ? { weekday: "long", day: "numeric" }
            : { weekday: "long", day: "numeric", month: "long" };
        const toOpts = { weekday: "long", day: "numeric", month: "long" };
        return `From ${from.toLocaleDateString("en-US", fromOpts)} to ${to.toLocaleDateString("en-US", toOpts)}`;
    });

    function handleConfirm(newDate) {
        if (newDate !== currentDate) {
            goto(withSort(`/time-entries/day/${newDate}`));
        }
    }

    function goToWeek() {
        const y = Number.parseInt(yearInput, 10);
        const w = Number.parseInt(weekInput, 10);
        if (y === currentYear && w === currentWeek) return;
        if (y > 0 && w > 0 && w <= 53) {
            goto(withSort(`/time-entries/week/${y}/${w}`));
        }
    }

    function onWeekInput(field) {
        return (e) => {
            if (field === "year") yearInput = e.target.value;
            else weekInput = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(goToWeek, 300);
        };
    }

    function handleWeekKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            goToWeek();
        }
    }

    function goToMonth() {
        const y = monthYearInput.padStart(4, "0");
        const m = monthNumInput.padStart(2, "0");
        const target = `${y}-${m}`;
        if (target === currentMonth) return;
        if (/^\d{4}-\d{2}$/.test(target)) {
            const monthNum = Number.parseInt(m, 10);
            if (monthNum >= 1 && monthNum <= 12) {
                goto(withSort(`/time-entries/month/${target}`));
            }
        }
    }

    function onMonthInput(field) {
        return (e) => {
            if (field === "year") monthYearInput = e.target.value;
            else monthNumInput = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(goToMonth, 300);
        };
    }

    function handleMonthKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            goToMonth();
        }
    }

    function isValidDate(d) {
        return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());
    }

    function goToRange() {
        if (fromInput === currentFrom && toInput === currentTo) return;
        if (fromInput && toInput && isValidDate(fromInput) && isValidDate(toInput)) {
            goto(withSort(`/time-entries/range?from=${fromInput}&to=${toInput}`));
        }
    }

    function handleFromConfirm(newDate) {
        fromInput = newDate;
        goToRange();
    }

    function handleToConfirm(newDate) {
        toInput = newDate;
        goToRange();
    }
</script>

<div class="mb-4">
    <nav
        class="grid items-center"
        style="grid-template-columns:1fr auto 1fr"
    >
        <div class="flex items-center gap-1 justify-self-start">
            {#if prevUrl}
                <a
                    href={withSort(prevUrl)}
                    class="text-blue-600 no-underline hover:underline">← {prevLabel}</a
                >
            {/if}
            {#if nearestNonEmptyUrl}
                <span class="text-gray-300">|</span>
                <a
                    href={withSort(nearestNonEmptyUrl)}
                    class="text-blue-600 no-underline hover:underline"
                >
                    {nearestNonEmptyLabel}
                </a>
            {/if}
        </div>

        <div class="justify-self-center">
            {#if currentDate}
                {#key currentDate}
                    <DateInput
                        value={currentDate}
                        onconfirm={handleConfirm}
                    />
                {/key}
            {:else if currentYear}
                {#key currentYear + "-" + currentWeek}
                    <div class="flex items-center gap-2">
                        <span class="text-[13px] text-gray-600">Year:</span>
                        <input
                            type="number"
                            class="w-20 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                            min="2000"
                            max="2100"
                            value={yearInput}
                            oninput={onWeekInput("year")}
                            onkeydown={handleWeekKeydown}
                        />
                        <span class="text-gray-300">|</span>
                        <span class="text-[13px] text-gray-600">Week number:</span>
                        <input
                            type="number"
                            class="w-16 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                            min="1"
                            max="53"
                            value={weekInput}
                            oninput={onWeekInput("week")}
                            onkeydown={handleWeekKeydown}
                        />
                    </div>
                    {#if weekDateRange}
                        <div class="text-center text-[13px] text-gray-500 mt-1">
                            {weekDateRange}
                        </div>
                    {/if}
                {/key}
            {:else if currentMonth}
                {#key currentMonth}
                    <div class="flex items-center gap-2">
                        <span class="text-[13px] text-gray-600">Year:</span>
                        <input
                            type="number"
                            class="w-20 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                            min="2000"
                            max="2100"
                            value={monthYearInput}
                            oninput={onMonthInput("year")}
                            onkeydown={handleMonthKeydown}
                        />
                        <span class="text-gray-300">|</span>
                        <span class="text-[13px] text-gray-600">Month:</span>
                        <input
                            type="number"
                            class="w-16 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                            min="1"
                            max="12"
                            value={monthNumInput}
                            oninput={onMonthInput("month")}
                            onkeydown={handleMonthKeydown}
                        />
                    </div>
                    {#if monthDateRange}
                        <div class="text-center text-[13px] text-gray-500 mt-1">
                            {monthDateRange}
                        </div>
                    {/if}
                {/key}
            {:else if currentFrom != null}
                {#key currentFrom + "-" + currentTo}
                    <div class="flex items-center gap-2">
                        <span class="text-[13px] text-gray-600">From:</span>
                        {#key fromInput}
                            <DateInput
                                value={fromInput}
                                onconfirm={handleFromConfirm}
                            />
                        {/key}
                        <span class="text-gray-300">|</span>
                        <span class="text-[13px] text-gray-600">To:</span>
                        {#key toInput}
                            <DateInput
                                value={toInput}
                                onconfirm={handleToConfirm}
                            />
                        {/key}
                    </div>
                    {#if rangeDateRange}
                        <div class="text-center text-[13px] text-gray-500 mt-1">
                            {rangeDateRange}
                        </div>
                    {/if}
                {/key}
            {/if}
        </div>

        <div class="justify-self-end">
            {#if nextUrl}
                <a
                    href={withSort(nextUrl)}
                    class="text-blue-600 no-underline hover:underline">{nextLabel} →</a
                >
            {/if}
        </div>
    </nav>
    {#if prevUrl || nextUrl}
        <div class="flex justify-end text-[11px] text-gray-400 mt-1">
            <span>
                <kbd class="border border-gray-300 rounded px-[4px] pb-[1px] text-[11px] font-mono bg-gray-100">←</kbd>
                <kbd class="border border-gray-300 rounded px-[4px] pb-[1px] text-[11px] font-mono bg-gray-100">→</kbd>
                navigate
            </span>
        </div>
    {/if}
</div>
