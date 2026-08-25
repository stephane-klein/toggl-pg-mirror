<script>
    import "uno.css";
    import { page } from "$app/stores";
    import TechInfoPopup from "$lib/client/TechInfoPopup.svelte";

    let { children } = $props();
</script>

<div class="page-wrap">
    <div class="content">
        {@render children()}
    </div>

    {#if !$page.route.id?.startsWith("/(private)/time-entries")}
        <footer class="border-t border-gray-300">
            <div class="page px-5 py-3 text-xs text-gray-500 flex items-center justify-between">
                <nav class="flex items-center gap-1">
                    <a
                        href="/docs"
                        class="text-gray-500 no-underline hover:underline">Docs</a
                    >
                    |
                    <a
                        href="/api/reference"
                        class="text-gray-500 no-underline hover:underline">API</a
                    >
                    |
                    <a
                        href="https://github.com/stephane-klein/toggl-pg-mirror"
                        class="text-gray-500 no-underline hover:underline">GitHub</a
                    >
                    |
                    <a
                        href="/-/version.json"
                        class="text-gray-500 no-underline hover:underline">Version</a
                    >
                </nav>
            </div>
        </footer>
    {/if}

    <div class="metrics-root">
        <TechInfoPopup />
    </div>
</div>

<style>
    .page-wrap {
        position: relative;
        min-height: 100vh;
    }

    .metrics-root {
        position: absolute;
        bottom: 0;
        right: 0;
    }
</style>
