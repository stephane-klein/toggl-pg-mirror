<script>
    import { writable } from "svelte/store";
    import { onMount, onDestroy, tick } from "svelte";
    import { beforeNavigate, afterNavigate } from "$app/navigation";
    import { browser } from "$app/environment";
    import { env } from "$env/dynamic/public";

    const pageMetrics = writable({ ssr: null, csr: null });

    let open = $state(false);
    let navStart = 0;
    let observer;
    let popupEl = $state(null);

    function ms(v) {
        if (v == null) return "\u2014";
        return v.toFixed(1);
    }

    function formatSize(bytes) {
        if (bytes == null) return "\u2014";
        if (bytes === 0) return "from browser cache";
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    function fromServerTiming(entry, networkMs, prefix) {
        const st = entry.serverTiming;
        if (!st?.length) return null;
        const get = (suffix) => st.find((s) => s.name === `${prefix}-${suffix}`)?.duration ?? 0;
        return {
            sqlQueryCount: get("pgcount"),
            sqlQueryMs: get("pgtime"),
            processingMs: get("processing"),
            networkMs,
            totalMs: get("processing") + networkMs,
        };
    }

    function initNavigationMetrics() {
        const nav = performance.getEntriesByType("navigation")[0];
        if (!nav) return;
        const networkMs = nav.responseEnd - nav.requestStart;
        const ssr = fromServerTiming(nav, networkMs, "ssr");
        if (ssr)
            pageMetrics.set({
                ssr: { ...ssr, transferSize: nav.transferSize, decodedBodySize: nav.decodedBodySize },
                csr: null,
            });
    }

    function initCsrObserver() {
        const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.name.includes("__data.json")) continue;
                const r = entry;
                const networkMs = r.responseEnd - r.requestStart;
                const csr = fromServerTiming(r, networkMs, "csr");
                if (csr)
                    pageMetrics.update((m) => ({
                        ...m,
                        csr: { ...csr, transferSize: r.transferSize, decodedBodySize: r.decodedBodySize },
                    }));
            }
        });
        obs.observe({ entryTypes: ["resource"] });
        return obs;
    }

    function handleClickOutside(event) {
        if (!popupEl || !open) return;
        if (popupEl.contains(event.target)) return;
        if (event.target.closest(".trigger")) return;
        open = false;
    }

    onMount(() => {
        if (!browser) return;
        initNavigationMetrics();
        observer = initCsrObserver();

        const nav = performance.getEntriesByType("navigation")[0];
        if (nav) {
            const clientStartupMs = performance.now() - nav.responseEnd;
            pageMetrics.update((m) => (m.ssr ? { ...m, ssr: { ...m.ssr, clientStartupMs } } : m));
        }

        document.addEventListener("click", handleClickOutside);
    });

    onDestroy(() => {
        observer?.disconnect();
        if (!browser) return;
        document.removeEventListener("click", handleClickOutside);
    });

    beforeNavigate(() => {
        performance.mark("nav-start");
        navStart = performance.now();
    });

    afterNavigate(async () => {
        if (performance.getEntriesByName("nav-start").length) {
            performance.mark("nav-end");
            performance.measure("CSR Navigation", "nav-start", "nav-end");
        }

        const clientRenderMs = performance.now() - navStart;
        await tick();
        await new Promise((r) => setTimeout(r, 0));
        pageMetrics.update((m) =>
            m.csr ? { ...m, csr: { ...m.csr, clientRenderMs, totalMs: m.csr.totalMs + clientRenderMs } } : m,
        );
    });
</script>

<button
    class="trigger"
    onclick={() => (open = !open)}>tech info</button
>

{#if open}
    <div
        class="popup"
        bind:this={popupEl}
    >
        <button
            class="close"
            onclick={() => (open = false)}>&#x2715;</button
        >

        <div class="version">
            <div>Built at <span class="val">{env.PUBLIC_BUILD_STAMP ?? "—"}</span></div>
            <div>
                GitHub SHA1 version : <a
                    href="{env.PUBLIC_REPO_URL}/commit/{env.PUBLIC_GIT_HASH}"
                    target="_blank"
                    rel="external"><span class="val">{env.PUBLIC_GIT_HASH?.slice(0, 7) ?? "—"}</span></a
                >
            </div>
        </div>

        {#if $pageMetrics.ssr}
            <div class="section">
                <div class="section-title">
                    <a
                        href="https://svelte.dev/docs/kit/glossary#SSR"
                        target="_blank"
                        rel="external">SSR</a
                    >
                    <span class="desc">— first full page load</span>
                </div>
                <div class="row">
                    total: <span class="val">{ms($pageMetrics.ssr.totalMs)}ms</span> = server + network (page visible)
                </div>
                <div class="row child">
                    server processing in SvelteKit (load functions, hooks): <span class="val"
                        >{ms($pageMetrics.ssr.processingMs)}ms</span
                    >
                </div>
                <div class="row grandchild">
                    <span class="val">{$pageMetrics.ssr.sqlQueryCount}</span> database queries &mdash;
                    <span class="val">{ms($pageMetrics.ssr.sqlQueryMs)}ms</span> total in PostgreSQL
                </div>
                <div class="row child">
                    network roundtrip to download the HTML page: <span class="val"
                        >{ms($pageMetrics.ssr.networkMs)}ms</span
                    >
                </div>
                <div class="row grandchild">
                    page weight: <span class="val">{formatSize($pageMetrics.ssr.transferSize)}</span>
                    / <span class="val">{formatSize($pageMetrics.ssr.decodedBodySize)}</span> decoded
                </div>
            </div>
            <div class="row client-startup">
                client startup: <span class="val">{ms($pageMetrics.ssr.clientStartupMs)}ms</span>
                (page already visible,
                <a
                    href="https://svelte.dev/docs/kit/glossary#Hydration"
                    target="_blank"
                    rel="external">hydration</a
                > + resource loading)
            </div>
        {:else}
            <div class="section">
                <a
                    href="https://svelte.dev/docs/kit/glossary#SSR"
                    target="_blank"
                    rel="external">SSR</a
                >: pending
            </div>
        {/if}

        {#if $pageMetrics.csr}
            <div class="section">
                <div class="section-title">
                    <a
                        href="https://svelte.dev/docs/kit/glossary#CSR"
                        target="_blank"
                        rel="external">CSR</a
                    >
                    <span class="desc">— last rendering after client navigation</span>
                </div>
                <div class="row">
                    total: <span class="val">{ms($pageMetrics.csr.totalMs)}ms</span> = server + network + client rendering
                </div>
                <div class="row child">
                    server processing in SvelteKit (load functions, hooks): <span class="val"
                        >{ms($pageMetrics.csr.processingMs)}ms</span
                    >
                </div>
                <div class="row grandchild">
                    <span class="val">{$pageMetrics.csr.sqlQueryCount}</span> database queries &mdash;
                    <span class="val">{ms($pageMetrics.csr.sqlQueryMs)}ms</span> total in PostgreSQL
                </div>
                <div class="row child">
                    network roundtrip to fetch JSON data: <span class="val">{ms($pageMetrics.csr.networkMs)}ms</span>
                </div>
                <div class="row grandchild">
                    page weight: <span class="val">{formatSize($pageMetrics.csr.transferSize)}</span>
                    / <span class="val">{formatSize($pageMetrics.csr.decodedBodySize)}</span> decoded
                </div>
                <div class="row child-last">
                    client rendering: <span class="val">{ms($pageMetrics.csr.clientRenderMs)}ms</span>
                </div>
            </div>
        {:else}
            <div class="section">
                <a
                    href="https://svelte.dev/docs/kit/glossary#CSR"
                    target="_blank"
                    rel="external">CSR</a
                >: none
            </div>
        {/if}
    </div>
{/if}

<style>
    .trigger {
        position: absolute;
        bottom: 0;
        right: 0;
        background: #f5f5f5;
        color: #666;
        border: 1px solid #ddd;
        font: 11px monospace;
        padding: 2px 6px;
        cursor: pointer;
        opacity: 0.7;
        white-space: nowrap;
    }

    .trigger:hover {
        opacity: 1;
    }

    .popup {
        position: absolute;
        bottom: 28px;
        right: 8px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        padding: 12px 16px;
        font: 11px monospace;
        color: #666;
        min-width: 320px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .close {
        position: absolute;
        top: 4px;
        right: 6px;
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font: 11px monospace;
        opacity: 0.5;
        padding: 0;
    }

    .close:hover {
        opacity: 1;
    }

    .section {
        margin-top: 8px;
    }

    .section:first-child {
        margin-top: 0;
    }

    .section-title {
        margin-bottom: 4px;
    }

    .popup a {
        color: inherit;
        text-decoration: underline;
        text-decoration-style: dotted;
        text-underline-offset: 2px;
    }

    .section-title a {
        color: #444;
    }

    .row {
        white-space: nowrap;
    }

    .row.child {
        padding-left: 14px;
    }

    .row.child-last {
        padding-left: 14px;
    }

    .row.grandchild {
        padding-left: 28px;
    }

    .val {
        font-weight: 700;
    }

    .desc {
        color: #888;
        font-style: italic;
        font-weight: 400;
    }

    .row.client-startup {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px dotted #ddd;
    }

    .version {
        margin-bottom: 6px;
        line-height: 1.8;
    }
</style>
