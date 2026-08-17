<script>
    let { data } = $props();
</script>

<svelte:head>
    <meta
        name="referrer"
        content="strict-origin"
    />
    <title>Sign in — toggl-pg-mirror</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2">
        <a
            href="/"
            class="font-bold text-base no-underline hover:underline">toggl-pg-mirror</a
        >
    </div>
</header>

<main class="page px-5 pt-9 pb-24">
    {#if data.invalid}
        <h1 class="text-xl font-bold mb-2 tracking-tight">Invalid or expired link</h1>
        <p class="text-sm text-gray-500 mb-6 max-w-sm">
            This magic link is invalid or has expired. Request a new one from the sign in page.
        </p>
        <a
            href="/login"
            class="text-sm text-blue-600 hover:underline">Go to sign in</a
        >
    {/if}
</main>
