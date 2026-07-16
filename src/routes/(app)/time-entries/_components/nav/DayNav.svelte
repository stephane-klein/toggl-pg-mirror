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
        sort = "",
    } = $props();

    function withSort(path) {
        if (!sort || !path) return path;
        return path.includes("?") ? `${path}&sort=${sort}` : `${path}?sort=${sort}`;
    }

    function handleConfirm(newDate) {
        if (newDate !== currentDate) {
            goto(withSort(`/time-entries/day/${newDate}`));
        }
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
            {#key currentDate}
                <DateInput
                    value={currentDate}
                    onconfirm={handleConfirm}
                />
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
