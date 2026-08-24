<script>
    let { data, form } = $props();
</script>

<svelte:head>
    <title>Change password — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Change password</h1>

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    {#if form?.saved}
        <p class="text-sm text-green-600 mb-3.5">Password updated.</p>
    {/if}

    <form
        method="POST"
        class="max-w-sm"
    >
        {#if data.hasPassword}
            <div class="mb-3">
                <label
                    for="current-password"
                    class="block text-sm font-semibold mb-1">Current password</label
                >
                <input
                    type="password"
                    id="current-password"
                    name="current-password"
                    autocomplete="current-password"
                    required
                    class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                />
                <p class="text-xs text-gray-500 mt-1.5">
                    Can't remember it? Check your browser's password manager, or send a reset link to your email.
                </p>
            </div>
        {:else}
            <p class="text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-sm px-3 py-2 mb-3">
                You don't currently have a password. Just choose a new one below.
            </p>
        {/if}

        <div class="mb-3">
            <label
                for="new-password"
                class="block text-sm font-semibold mb-1">New password</label
            >
            <input
                type="password"
                id="new-password"
                name="new-password"
                autocomplete="new-password"
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mb-3">
            <label
                for="confirm"
                class="block text-sm font-semibold mb-1">Confirm new password</label
            >
            <input
                type="password"
                id="confirm"
                name="confirm"
                autocomplete="new-password"
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mt-4">
            <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
            >
                Update password
            </button>
        </div>
    </form>

    {#if data.hasPassword}
        <form
            method="POST"
            action="?/sendResetLink"
            class="mt-3"
        >
            {#if form?.resetSent}
                <span class="text-xs text-green-600">
                    We sent a reset link to <strong class="font-mono">{data.email}</strong>.
                </span>
            {:else if form?.resetError}
                <span class="text-xs text-red-600">{form.resetError}</span>
            {:else if form?.mail_unavailable}
                <span class="text-xs text-red-600">Email service is not configured.</span>
            {:else}
                <button
                    type="submit"
                    class="text-xs text-blue-600 underline cursor-pointer"
                >
                    Send a reset link to {data.email}
                </button>
            {/if}
        </form>
    {/if}
</main>
