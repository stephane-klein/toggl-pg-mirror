<svelte:head>
    <title>toggl-pg-mirror</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline text-inherit">toggl-pg-mirror</a
        >
    </div>
</header>

<main class="page px-5 pt-10 pb-24">
    <h1 class="text-xl font-bold mb-1">toggl-pg-mirror</h1>
    <p class="text-sm text-gray-500 mb-8">Mirrors Toggl time-tracking data into a local PostgreSQL database.</p>

    <section class="mb-8">
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Endpoints</h2>
        <table class="w-full text-sm border-collapse">
            <tbody>
                <tr>
                    <td class="py-1.5 pr-4 font-mono text-xs">
                        <a
                            href="/-/healthy"
                            class="text-blue-600 no-underline hover:underline">/-/healthy</a
                        >
                    </td>
                    <td class="py-1.5 text-gray-500">Liveness probe</td>
                </tr>
                <tr>
                    <td class="py-1.5 pr-4 font-mono text-xs">
                        <a
                            href="/-/ready"
                            class="text-blue-600 no-underline hover:underline">/-/ready</a
                        >
                    </td>
                    <td class="py-1.5 text-gray-500">Readiness probe</td>
                </tr>
                <tr>
                    <td class="py-1.5 pr-4 font-mono text-xs">
                        <a
                            href="/-/version.json"
                            class="text-blue-600 no-underline hover:underline">/-/version.json</a
                        >
                    </td>
                    <td class="py-1.5 text-gray-500">Build version info</td>
                </tr>
            </tbody>
        </table>
    </section>

    <section>
        <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Data import</h2>
        <table class="w-full text-sm border-collapse">
            <tbody>
                <tr>
                    <td class="py-1.5 pr-4 font-mono text-xs">
                        <a
                            href="/import-csv"
                            class="text-blue-600 no-underline hover:underline">/import-csv</a
                        >
                    </td>
                    <td class="py-1.5 text-gray-500"> Import time entries from a Toggl CSV export </td>
                </tr>
            </tbody>
        </table>
    </section>
</main>
