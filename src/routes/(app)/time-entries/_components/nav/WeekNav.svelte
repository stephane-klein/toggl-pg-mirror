<script>
    import { goto } from "$app/navigation";

    let {
        prevLabel = "",
        prevUrl = "",
        nextLabel = "",
        nextUrl = "",
        currentYear = 0,
        currentWeek = 0,
        nearestNonEmptyUrl = "",
        nearestNonEmptyLabel = "",
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

    function goToWeek() {
        const y = Number.parseInt(yearInput, 10);
        const w = Number.parseInt(weekInput, 10);
        if (y === currentYear && w === currentWeek) return;
        if (y > 0 && w > 0 && w <= 53) {
            goto(withSort(`/time-entries/week/${y}/${w}`));
        }
    }

    function onInput(field) {
        return (e) => {
            if (field === "year") yearInput = e.target.value;
            else weekInput = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(goToWeek, 300);
        };
    }

    function handleKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            goToWeek();
        }
    }

    let weekDateRange = $derived.by(() => {
        if (!currentYear || !currentWeek) return "";
        const jan4 = new Date(currentYear, 0, 4);
        const dow = jan4.getDay() || 7;
        const week1MondayOffset = 4 - (dow - 1);
        const monday = new Date(currentYear, 0, week1MondayOffset + (currentWeek - 1) * 7);
        const sunday = new Date(currentYear, 0, week1MondayOffset + (currentWeek - 1) * 7 + 6);
        const sameMonth = monday.getMonth() === sunday.getMonth();
        const mondayOpts = sameMonth
            ? { weekday: "long", day: "numeric" }
            : { weekday: "long", day: "numeric", month: "long" };
        const sundayOpts = { weekday: "long", day: "numeric", month: "long" };
        return `From ${monday.toLocaleDateString("en-US", mondayOpts)} to ${sunday.toLocaleDateString("en-US", sundayOpts)}`;
    });
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
            {#key currentYear + "-" + currentWeek}
                <div class="flex items-center gap-2">
                    <span class="text-[13px] text-gray-600">Year:</span>
                    <input
                        type="number"
                        class="w-20 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                        min="2000"
                        max="2100"
                        value={yearInput}
                        oninput={onInput("year")}
                        onkeydown={handleKeydown}
                    />
                    <span class="text-gray-300">|</span>
                    <span class="text-[13px] text-gray-600">Week number:</span>
                    <input
                        type="number"
                        class="w-16 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                        min="1"
                        max="53"
                        value={weekInput}
                        oninput={onInput("week")}
                        onkeydown={handleKeydown}
                    />
                </div>
                {#if weekDateRange}
                    <div class="text-center text-[13px] text-gray-500 mt-1">
                        {weekDateRange}
                    </div>
                {/if}
            {/key}
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
