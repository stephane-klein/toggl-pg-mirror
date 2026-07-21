<script>
    import { goto } from "$app/navigation";
    import DateInput from "$lib/components/DateInput.svelte";

    let { currentFrom = null, currentTo = null, sort = "" } = $props();

    function withSort(path) {
        if (!sort || !path) return path;
        return path.includes("?") ? `${path}&sort=${sort}` : `${path}?sort=${sort}`;
    }

    let fromInput = $state(currentFrom ?? "");
    let toInput = $state(currentTo ?? "");

    $effect(() => {
        fromInput = currentFrom ?? "";
        toInput = currentTo ?? "";
    });

    function isValidDate(d) {
        return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime());
    }

    function offsetDate(dateStr, amount, unit) {
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        if (unit === "day") date.setDate(date.getDate() + amount);
        if (unit === "week") date.setDate(date.getDate() + amount * 7);
        if (unit === "month") date.setMonth(date.getMonth() + amount);
        if (unit === "year") date.setFullYear(date.getFullYear() + amount);
        const yy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
    }

    function handleLeftOffset(amount, unit) {
        if (fromInput) {
            fromInput = offsetDate(fromInput, amount, unit);
            goToRange();
        }
    }

    function handleRightOffset(amount, unit) {
        if (toInput) {
            toInput = offsetDate(toInput, amount, unit);
            goToRange();
        }
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

    let dayCount = $derived.by(() => {
        if (!currentFrom || !currentTo) return null;
        const from = new Date(currentFrom);
        const to = new Date(currentTo);
        return Math.round((Number(to) - Number(from)) / (1000 * 60 * 60 * 24)) + 1;
    });
</script>

<div class="mb-3">
    <div
        class="grid items-center"
        style="grid-template-columns:1fr auto 1fr"
    >
        <div class="flex flex-col items-start gap-0.5 justify-self-start">
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => handleLeftOffset(-1, "day")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 day</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(-1, "week")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 week</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(-1, "month")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 month</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(-1, "year")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 year</button>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => handleLeftOffset(1, "day")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 day</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(1, "week")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 week</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(1, "month")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 month</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleLeftOffset(1, "year")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 year</button>
            </div>
        </div>

        <div class="justify-self-center">
            {#key currentFrom + "-" + currentTo}
                <div class="flex items-center gap-2">
                    <span class="text-[13px] text-gray-600">From:</span>
                    {#key fromInput}
                        <DateInput
                            value={fromInput}
                            onconfirm={handleFromConfirm}
                        />
                    {/key}
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
                        {#if dayCount}
                            — {dayCount} day{dayCount > 1 ? "s" : ""}
                        {/if}
                    </div>
                {/if}
            {/key}
        </div>

        <div class="flex flex-col items-end gap-0.5 justify-self-end">
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => handleRightOffset(-1, "day")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 day</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(-1, "week")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 week</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(-1, "month")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 month</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(-1, "year")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">-1 year</button>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" onclick={() => handleRightOffset(1, "day")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 day</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(1, "week")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 week</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(1, "month")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 month</button>
                <span class="text-gray-300">|</span>
                <button type="button" onclick={() => handleRightOffset(1, "year")} class="text-blue-600 no-underline hover:underline bg-transparent border-none p-0 cursor-pointer inline text-[13px]">+1 year</button>
            </div>
        </div>
    </div>
</div>
