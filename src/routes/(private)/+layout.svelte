<script>
    import { page } from "$app/stores";

    let { children } = $props();

    let timeEntriesHref = $derived.by(() => {
        const pathname = $page.url.pathname;
        if (pathname.startsWith("/time-entries/")) return pathname + $page.url.search;
        if (pathname.startsWith("/charts/")) {
            return `/time-entries${pathname.slice("/charts".length)}`;
        }
        return "/time-entries";
    });

    let chartsHref = $derived.by(() => {
        const pathname = $page.url.pathname;
        if (pathname.startsWith("/charts/")) return pathname + $page.url.search;
        if (pathname.startsWith("/time-entries/")) {
            return `/charts${pathname.slice("/time-entries".length)}`;
        }
        return "/charts";
    });
</script>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline text-inherit">toggl-pg-mirror</a
        >
        <nav class="text-sm text-gray-500">
            <a
                href={timeEntriesHref}
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Time entries</a
            >
            ·
            <a
                href={chartsHref}
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Charts</a
            >
            ·
            <a
                href="/docs"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Import CSV</a
            >
            ·
            <a
                href="/my/profile"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Profile</a
            >
            ·
            <a
                href="/my/tokens"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Tokens</a
            >
            ·
            <a
                href="/logout"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Sign out</a
            >
        </nav>
    </div>
</header>

{@render children()}
