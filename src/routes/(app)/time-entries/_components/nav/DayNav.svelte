<script>
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { modifyCurrentUrl } from "$lib/url";
    import DateInput from "$lib/components/DateInput.svelte";

    let {
        prevLabel = "",
        prevHref = null,
        nextLabel = "",
        nextHref = null,
        currentDate = "",
        nearestNonEmptyHref = null,
        nearestNonEmptyLabel = "",
    } = $props();

    function handleConfirm(newDate) {
        if (newDate !== currentDate) {
            goto(modifyCurrentUrl($page.url, `/time-entries/day/${newDate}`, { before: null, after: null }));
        }
    }
</script>

<div class="mb-3">
    <nav
        class="grid items-center"
        style="grid-template-columns:1fr auto 1fr"
    >
        <div class="flex items-center gap-1 justify-self-start">
            {#if prevHref}
                <a
                    href={prevHref}
                    class="text-blue-600 no-underline hover:underline">← {prevLabel}</a
                >
            {/if}
            {#if nearestNonEmptyHref}
                <span class="text-gray-300">|</span>
                <a
                    href={nearestNonEmptyHref}
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
            {#if nextHref}
                <a
                    href={nextHref}
                    class="text-blue-600 no-underline hover:underline">{nextLabel} →</a
                >
            {/if}
        </div>
    </nav>
    {#if prevHref || nextHref}
        <div class="flex justify-end text-[11px] text-gray-400 mt-1">
            <span>
                <kbd class="border border-gray-300 rounded px-[4px] pb-[1px] text-[11px] font-mono bg-gray-100">←</kbd>
                <kbd class="border border-gray-300 rounded px-[4px] pb-[1px] text-[11px] font-mono bg-gray-100">→</kbd>
                navigate
            </span>
        </div>
    {/if}
</div>
