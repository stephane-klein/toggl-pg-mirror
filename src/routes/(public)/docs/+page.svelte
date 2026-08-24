<script>
    const { data } = $props();
    const userToken = "${TOGGL_PG_MIRROR_API_TOKEN}";
    const adminToken = "${TOGGL_PG_MIRROR_ADMIN_TOKEN}";
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

    <p class="mb-2">Import a Toggl CSV export via HTTP POST:</p>

    <p class="mb-2">
        The endpoint must be authenticated with an access token in the
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">Authorization: Bearer</code> header, either a
        <a
            href="/my/tokens/"
            class="text-blue-600 hover:underline">user API token</a
        >
        (created via
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">toggl-pg-mirror create-api-token</code>) or the
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">TOGGL_PG_MIRROR_ADMIN_TOKEN</code> admin token.
    </p>

    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono">
$ curl -X POST {data.origin}/api/v1/time-entries/import-csv \
    -H "Authorization: Bearer {userToken}" \
    -F "file=@Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
</pre>

    Or with <a class="text-blue-600 hover:underline" href="https://github.com/ducaale/xh">xh</a> and <a  class="text-blue-600 hover:underline" href="https://github.m/junegunn/fzf">fzf</a> to
    select the file:

    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono">
$ xh -b --form POST {data.origin}/api/v1/time-entries/import-csv \
    Authorization:"Bearer {userToken}" file@$(fzf)
</pre>

    The admin token works the same way, replacing the user token with
    <code class="bg-gray-100 px-1 py-0.5 rounded-sm">{adminToken}</code>.

    <p class="mt-5 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <a
            href="/"
            class="text-blue-600 hover:underline">Back to home</a
        >
    </p>
</main>
