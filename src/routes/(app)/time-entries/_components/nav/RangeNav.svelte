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
</script>

<div class="mb-4">
    <div
        class="grid items-center"
        style="grid-template-columns:1fr auto 1fr"
    >
        <div></div>

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
        </div>

        <div></div>
    </div>
</div>
