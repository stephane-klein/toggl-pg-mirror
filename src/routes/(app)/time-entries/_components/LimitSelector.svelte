<script>
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { modifyCurrentUrl } from "$lib/url";

    const AUTO_LIMITS = { day: 500, week: 500, month: 50, range: 50 };

    let { mode = "day" } = $props();

    let rawLimit = $derived($page.url.searchParams.get("limit") || "auto");

    let autoLabel = $derived(
        mode === "day" || mode === "week" ? `Auto — up to ${AUTO_LIMITS[mode]}` : `Auto — ${AUTO_LIMITS[mode]}`,
    );

    let autoTitle = $derived(`Auto: shows all entries for the current view (up to ${AUTO_LIMITS[mode]} for ${mode})`);

    function handleLimitChange(event) {
        goto(modifyCurrentUrl($page.url, null, { limit: event.target.value }));
    }
</script>

<label class="flex items-center gap-1 text-[13px] text-gray-500">
    <span class="text-gray-500">Page size</span>
    <select
        class="border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans text-gray-700 bg-white"
        value={rawLimit}
        onchange={handleLimitChange}
        title={autoTitle}
    >
        <option value="auto">{autoLabel}</option>
        <option value={20}>20 per page</option>
        <option value={50}>50 per page</option>
        <option value={100}>100 per page</option>
    </select>
</label>
