<script>
    const { data } = $props();
</script>

<svelte:head>
    <title>Docs — toggl-pg-mirror</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline hover:underline">toggl-pg-mirror</a
        >
        <nav class="text-sm text-gray-500">
            <a
                href="/login"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Sign in</a
            >
        </nav>
    </div>
</header>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Import CSV</h1>

    <p>Import a Toggl CSV export via HTTP POST:</p>

    <pre>
$ curl -X POST {data.origin}/api/v1/time-entries/import-csv -F "file=@Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
</pre>

    Or with<a href="https://github.com/ducaale/xh">xh</a> and <a href="https://github.com/junegunn/fzf">fzf</a> to
    select the file:

    <pre>
$ xh -b --form POST {data.origin}/api/v1/time-entries/import-csv file@$(fzf)
</pre>

    <p class="mt-5 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <a
            href="/"
            class="text-blue-600 hover:underline">Back to home</a
        >
    </p>
</main>
