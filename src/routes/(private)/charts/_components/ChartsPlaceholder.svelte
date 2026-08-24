<script>
    let { mode = "", periodLabel = "" } = $props();
</script>

<div class="border border-dashed border-gray-300 rounded p-6 mt-2 text-center text-gray-500">
    <p class="text-sm">Charts placeholder — {periodLabel}</p>
    <p class="text-xs mt-1">Charts for the {mode} period will be displayed here.</p>
</div>
