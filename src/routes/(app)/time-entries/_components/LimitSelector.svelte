<script>
    import { goto } from "$app/navigation";

    let { limit = 50, baseQuery = "" } = $props();

    function handleLimitChange(event) {
        const q = baseQuery ? `?${baseQuery}&limit=${event.target.value}` : `?limit=${event.target.value}`;
        goto(q);
    }
</script>

<label class="flex items-center gap-1 text-[13px] text-gray-500">
    <select
        class="border border-gray-300 rounded px-1 py-[1px] text-[13px] font-sans text-gray-700 bg-white"
        value={limit}
        onchange={handleLimitChange}
    >
        <option value={20}>20 per page</option>
        <option value={50}>50 per page</option>
        <option value={100}>100 per page</option>
    </select>
</label>
