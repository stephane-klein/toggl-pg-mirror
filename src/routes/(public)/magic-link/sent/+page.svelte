<script>
    let { data } = $props();
</script>

<svelte:head>
    <title>Magic link sent — toggl-pg-mirror</title>
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
    <h1 class="text-xl font-bold mb-2 tracking-tight">Check your email</h1>

    <p class="text-sm mb-6 max-w-sm">
        We sent a sign-in link to <strong class="font-mono">{data.email}</strong>. Click it to sign in.
    </p>

    <p class="text-xs text-gray-500 mb-2 max-w-sm">The link expires in 15 minutes.</p>

    <p class="text-sm text-gray-500">
        <a
            href="/login"
            class="text-blue-600 hover:underline">Use a different email</a
        >
        |
        <a
            href="/"
            class="text-blue-600 hover:underline">Go to home</a
        >
    </p>
</main>
