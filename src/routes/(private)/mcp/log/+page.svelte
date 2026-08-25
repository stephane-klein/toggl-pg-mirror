<script>
    import { format } from "date-fns";

    let { data } = $props();

    function fmtTime(ts) {
        const d = new Date(ts);
        return isNaN(d.getTime()) ? ts : format(d, "yyyy-MM-dd HH:mm");
    }

    function shortQuery(q) {
        return q.length > 120 ? `${q.slice(0, 120)}…` : q;
    }

    function pagerUrl(page) {
        const parts = [];
        if (data.from) parts.push(`from=${data.from}`);
        if (data.to) parts.push(`to=${data.to}`);
        if (page > 1) parts.push(`page=${page}`);
        return parts.length ? `?${parts.join("&")}` : ".";
    }
</script>

<svelte:head>
    <title>MCP access log — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">MCP access log</h1>

    <div class="mb-3 text-sm flex items-center gap-2 text-gray-600">
        <span class="font-semibold text-gray-700">Range:</span>
        {#each data.presets as p (p.label)}
            <a
                href={p.href}
                class="text-blue-600 hover:underline">{p.label}</a
            >
            <span class="text-gray-300">·</span>
        {/each}
    </div>

    <form
        method="GET"
        action="/mcp/log"
        class="mb-6 flex items-center gap-2 text-sm"
    >
        <label
            for="from"
            class="text-gray-600">From</label
        >
        <input
            type="date"
            id="from"
            name="from"
            value={data.from ?? ""}
            class="px-2 py-1 border border-gray-300 rounded-sm text-sm"
        />
        <label
            for="to"
            class="text-gray-600">To</label
        >
        <input
            type="date"
            id="to"
            name="to"
            value={data.to ?? ""}
            class="px-2 py-1 border border-gray-300 rounded-sm text-sm"
        />
        <button
            type="submit"
            class="px-3 py-1 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700"
        >
            Apply
        </button>
    </form>

    <p class="mb-4 text-sm text-gray-600">
        {data.total} log{data.total === 1 ? "" : "s"}
        {data.from && data.to ? `from ${data.from} to ${data.to}` : "all time"}.
    </p>

    {#if data.rows.length === 0}
        <p class="text-sm text-gray-500 italic">No logs in this range.</p>
    {:else}
        <table class="w-full text-sm border-collapse">
            <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-gray-500 border-b-2 border-gray-300">
                    <th class="py-1.5 pr-3">Time</th>
                    <th class="py-1.5 pr-3">Client</th>
                    <th class="py-1.5 pr-3">IP</th>
                    <th class="py-1.5 pr-3">User</th>
                    <th class="py-1.5 pr-3">Purpose</th>
                    <th class="py-1.5">Query</th>
                    <th class="py-1.5 text-right">Status</th>
                </tr>
            </thead>
            <tbody>
                {#each data.rows as row (row.id)}
                    <tr class="border-b border-gray-200 align-top">
                        <td class="py-1.5 pr-3 whitespace-nowrap text-gray-600">{fmtTime(row.created_at)}</td>
                        <td class="py-1.5 pr-3 whitespace-nowrap">
                            {row.client_name}
                            {#if row.client_version}
                                <span class="text-gray-400">· {row.client_version}</span>
                            {/if}
                        </td>
                        <td class="py-1.5 pr-3 font-mono text-gray-600">{row.ip}</td>
                        <td class="py-1.5 pr-3">{row.display_name ?? row.user_id}</td>
                        <td
                            class="py-1.5 pr-3 text-gray-700"
                            title={row.purpose}>{row.purpose}</td
                        >
                        <td class="py-1.5 pr-3">
                            <details class="max-w-120">
                                <summary class="cursor-pointer font-mono text-xs text-gray-700 hover:text-blue-600"
                                    >{shortQuery(row.query)}</summary
                                >
                                <pre
                                    class="mt-2 p-2 bg-gray-100 rounded-sm font-mono text-xs whitespace-pre-wrap break-all">{row.query}</pre>
                            </details>
                        </td>
                        <td class="py-1.5 text-right">
                            <span
                                class="inline-block px-1.5 py-0.5 text-xs font-semibold rounded-sm
                                {row.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}"
                                >{row.success ? "ok" : "err"}</span
                            >
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>

        {#if data.pageCount > 1}
            <nav class="mt-5 text-sm flex items-center gap-2 text-gray-600">
                <a
                    href={pagerUrl(1)}
                    class="text-blue-600 hover:underline">« First</a
                >
                <a
                    href={pagerUrl(data.page - 1)}
                    class="text-blue-600 hover:underline">‹ Prev</a
                >
                <span>Page {data.page} of {data.pageCount}</span>
                <a
                    href={pagerUrl(data.page + 1)}
                    class="text-blue-600 hover:underline">Next ›</a
                >
                <a
                    href={pagerUrl(data.pageCount)}
                    class="text-blue-600 hover:underline">Last »</a
                >
            </nav>
        {/if}
    {/if}
</main>
