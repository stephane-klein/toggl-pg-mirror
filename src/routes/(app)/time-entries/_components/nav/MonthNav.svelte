<script>
    import { goto } from "$app/navigation";

    let {
        prevLabel = "",
        prevUrl = "",
        nextLabel = "",
        nextUrl = "",
        currentMonth = "",
        nearestNonEmptyUrl = "",
        nearestNonEmptyLabel = "",
        sort = "",
    } = $props();

    function withSort(path) {
        if (!sort || !path) return path;
        return path.includes("?") ? `${path}&sort=${sort}` : `${path}?sort=${sort}`;
    }

    let monthYearInput = $state(currentMonth ? currentMonth.split("-")[0] : "");
    let monthNumInput = $state(currentMonth ? currentMonth.split("-")[1] : "");
    let debounceTimer;

    $effect(() => {
        if (currentMonth) {
            const [y, m] = currentMonth.split("-");
            monthYearInput = y;
            monthNumInput = m;
        }
    });

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

    function onInput(field) {
        return (e) => {
            if (field === "year") monthYearInput = e.target.value;
            else monthNumInput = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(goToMonth, 300);
        };
    }

    function handleKeydown(event) {
        if (event.key === "Enter") {
            clearTimeout(debounceTimer);
            goToMonth();
        }
    }

    let monthDateRange = $derived.by(() => {
        if (!currentMonth) return "";
        const [year, monthNum] = currentMonth.split("-").map(Number);
        const firstDay = new Date(year, monthNum - 1, 1);
        const lastDay = new Date(year, monthNum, 0);
        return `From ${firstDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })} to ${lastDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}`;
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
            {#key currentMonth}
                <div class="flex items-center gap-2">
                    <span class="text-[13px] text-gray-600">Year:</span>
                    <input
                        type="number"
                        class="w-20 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                        min="2000"
                        max="2100"
                        value={monthYearInput}
                        oninput={onInput("year")}
                        onkeydown={handleKeydown}
                    />
                    <span class="text-gray-300">|</span>
                    <span class="text-[13px] text-gray-600">Month:</span>
                    <input
                        type="number"
                        class="w-16 border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans"
                        min="1"
                        max="12"
                        value={monthNumInput}
                        oninput={onInput("month")}
                        onkeydown={handleKeydown}
                    />
                </div>
                {#if monthDateRange}
                    <div class="text-center text-[13px] text-gray-500 mt-1">
                        {monthDateRange}
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
