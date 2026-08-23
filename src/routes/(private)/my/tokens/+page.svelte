<script>
    let { data, form } = $props();

    function isExpired(token) {
        return token.expires_at && new Date(token.expires_at).getTime() <= Date.now();
    }
</script>

<svelte:head>
    <title>API tokens — toggl-pg-mirror</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">API tokens</h1>

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    {#if form?.created}
        <div class="max-w-md mb-5 p-3 border border-gray-300 rounded-sm">
            <p class="text-sm font-semibold mb-1">Token created</p>
            <p class="text-xs text-gray-500 mb-2">Store it safely — it is shown only once:</p>
            <code class="block text-xs bg-gray-100 p-2 rounded-sm break-all">{form.raw}</code>
        </div>
    {/if}

    {#if form?.deleted}
        <p class="text-sm text-green-600 mb-3.5">Token deleted.</p>
    {/if}

    <form
        method="POST"
        action="?/create"
        class="max-w-sm mb-8"
    >
        <div class="mb-3">
            <label
                for="name"
                class="block text-sm font-semibold mb-1">Token name</label
            >
            <input
                type="text"
                id="name"
                name="name"
                placeholder="Token name (e.g. CI/CD deploy)"
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>
        <div class="mb-3">
            <label
                for="expiresInDays"
                class="block text-sm font-semibold mb-1">Expiration (days)</label
            >
            <input
                type="number"
                id="expiresInDays"
                name="expiresInDays"
                min="1"
                placeholder="Leave empty for no expiration"
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>
        <div class="mt-4">
            <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
            >
                Create
            </button>
        </div>
    </form>

    <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Active tokens</h2>

    {#if data.tokens.length === 0}
        <p class="text-sm text-gray-500">No tokens yet.</p>
    {/if}

    <table class="w-full text-sm border-collapse max-w-md">
        <tbody>
            {#each data.tokens as token (token.id)}
                <tr class="border-b border-gray-200">
                    <td class="py-2 pr-4">
                        <span class="font-semibold {isExpired(token) ? 'text-gray-400' : ''}">{token.name}</span>
                        <span class="block text-xs {isExpired(token) ? 'text-red-500' : 'text-gray-500'}">
                            Created {new Date(token.created_at).toLocaleDateString()}
                            {#if token.last_used}· Last used {new Date(token.last_used).toLocaleDateString()}{/if}
                            · {token.expires_at
                                ? `Expires ${new Date(token.expires_at).toLocaleDateString()}`
                                : "Never expires"}
                            {#if isExpired(token)}
                                · <span class="font-semibold">Expired</span>
                            {/if}
                        </span>
                    </td>
                    <td class="py-2 text-right">
                        <form
                            method="POST"
                            action="?/delete"
                        >
                            <input
                                type="hidden"
                                name="id"
                                value={token.id}
                            />
                            <button
                                type="submit"
                                class="text-sm text-red-600 hover:underline cursor-pointer bg-transparent border-none"
                            >
                                Delete
                            </button>
                        </form>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</main>
