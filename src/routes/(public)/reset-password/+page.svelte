<script>
    import { dev } from "$app/environment";

    let { form } = $props();
</script>

<svelte:head>
    <title>Reset password — toggl-pg-mirror</title>
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
    <h1 class="text-xl font-bold mb-2 tracking-tight">Reset password</h1>
    <p class="text-sm text-gray-500 mb-6 max-w-sm">
        Enter your email and we'll send you a link to reset your password.
    </p>

    {#if form?.mail_unavailable}
        <div class="max-w-sm">
            <p class="text-sm text-red-600 mb-2">Email service is not configured.</p>
            <p class="text-xs text-gray-500">
                The forgot password feature is currently unavailable. Contact the administrator.
            </p>
        </div>
    {:else if form?.sent}
        <div class="max-w-sm">
            <p class="text-sm mb-2">We sent a reset link to <strong class="font-mono">{form.email}</strong>.</p>
            <p class="text-xs text-gray-500">
                Check your inbox — it may take a minute or two.
                {#if dev && form.resetLink}
                    <br />Debug:
                    <a
                        href="/change-password?token={form.resetLink.split('token=')[1]}"
                        class="text-blue-600 hover:underline">reset link</a
                    >
                {/if}
            </p>
        </div>
    {:else}
        {#if form?.error}
            <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
        {/if}

        <form
            method="POST"
            class="max-w-sm"
            novalidate
        >
            <div class="mb-3">
                <label
                    for="email"
                    class="block text-sm font-semibold mb-1">Email</label
                >
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    type="email"
                    id="email"
                    name="email"
                    autocomplete="email"
                    autofocus
                    required
                    class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                />
            </div>

            <div class="mt-4 flex items-center gap-3.5">
                <button
                    type="submit"
                    class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
                >
                    Send reset link
                </button>
            </div>
        </form>
    {/if}

    <p class="mt-5 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <a
            href="/login"
            class="text-blue-600 hover:underline">Back to sign in</a
        >
        |
        <a
            href="/"
            class="text-blue-600 hover:underline">Home</a
        >
    </p>
</main>
