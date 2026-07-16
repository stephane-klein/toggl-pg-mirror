<script>
    let { children } = $props();
</script>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline text-inherit">toggl-pg-mirror</a
        >
        <nav class="text-sm text-gray-500">
            <a
                href="/time-entries"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Time entries</a
            >
            ·
            <a
                href="/import-csv"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Import CSV</a
            >
        </nav>
    </div>
</header>

{@render children()}
