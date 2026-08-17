<script>
    let { data, form } = $props();
</script>

<svelte:head>
    <title>Profile — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Profile</h1>

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    {#if form?.saved}
        <p class="text-sm text-green-600 mb-3.5">Profile updated.</p>
    {/if}

    <form
        method="POST"
        class="max-w-sm"
    >
        <div class="mb-3">
            <label
                for="display-name"
                class="block text-sm font-semibold mb-1">Display name</label
            >
            <input
                type="text"
                id="display-name"
                name="display-name"
                value={data.user.display_name}
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mb-3">
            <label
                for="email"
                class="block text-sm font-semibold mb-1">Email</label
            >
            <input
                type="email"
                id="email"
                name="email"
                value={data.user.email}
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mt-4">
            <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
            >
                Save
            </button>
        </div>
    </form>

    <p class="mt-5 text-sm">
        <a
            href="/my/password"
            class="text-blue-600 hover:underline">Change password</a
        >
    </p>
</main>
