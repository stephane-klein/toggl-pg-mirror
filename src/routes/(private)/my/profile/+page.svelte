<script>
    import { onMount } from "svelte";
    import { dragHandleZone, dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from "svelte-dnd-action";
    import Svelecte from "svelecte";
    import { getAllTags } from "../../time-entries/_components/tags.remote.js";

    let { data, form } = $props();

    let categoryIdCounter = 0;

    function newCategoryId() {
        categoryIdCounter += 1;
        return `category-${categoryIdCounter}`;
    }

    const initialCategories = data.categories.map((category) => ({ ...category, id: newCategoryId() }));

    let categories = $state(initialCategories);

    /** @type {string[]} */
    let dbTags = $state([]);

    onMount(() => {
        getAllTags().then((tags) => {
            dbTags = tags;
        });
    });

    // Existing DB tags + the tags currently configured, so every current value
    // resolves in the svelecte options (strictMode) and stays pickable.
    let allKnownTags = $derived(
        [...new Set([...dbTags, ...categories.map((category) => category.tag).filter(Boolean)])].sort((a, b) =>
            a.localeCompare(b),
        ),
    );

    // Per-row dropdown options: all known tags minus those already used by the
    // other rows, so a tag configured elsewhere is not offered again. The row's
    // own tag is always kept so its value stays resolvable (strictMode).
    // Svelecte (clearable) sets a cleared value to null, so a tag can be null
    // mid-edit; treat it as "" (empty row: every known tag stays offerable).
    let rowTagOptions = $derived(
        categories.map((category) => {
            const ownTag = category.tag?.toLowerCase() ?? "";
            const used = new Set(
                categories
                    .filter((other) => other !== category)
                    .map((other) => other.tag?.toLowerCase() ?? "")
                    .filter(Boolean),
            );
            return allKnownTags.filter((tag) => tag.toLowerCase() === ownTag || !used.has(tag.toLowerCase()));
        }),
    );

    function addCategory() {
        categories = [...categories, { id: newCategoryId(), label: "", tag: "", color: "#000000" }];
    }

    function removeCategory(index) {
        categories = categories.filter((_, i) => i !== index);
    }

    function handleDndConsider(e) {
        categories = e.detail.items;
    }

    function handleDndFinalize(e) {
        categories = e.detail.items;
    }
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
        <input
            type="hidden"
            name="form"
            value="profile"
        />
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

    <p class="mt-4 text-sm">
        <a
            href="/my/password"
            class="text-blue-600 hover:underline">Change password</a
        >
    </p>

    <hr class="my-8 border-gray-200" />

    <h2 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Activity matrix categories</h2>
    <p class="text-sm text-gray-500 mb-3 max-w-xl">
        Categories shown in the /charts activity matrix, each mapped to a Toggl tag. Leave the list empty to hide the
        activity matrix.
    </p>

    {#if form?.matrixError}
        <p class="text-sm text-red-600 mb-3.5">{form.matrixError}</p>
    {/if}

    {#if form?.matrixSaved}
        <p class="text-sm text-green-600 mb-3.5">Activity matrix categories updated.</p>
    {/if}

    <form method="POST">
        <input
            type="hidden"
            name="form"
            value="activity-matrix"
        />
        <table class="w-full max-w-3xl text-sm border-collapse">
            <colgroup>
                <col class="w-6" />
                <col class="w-[40%]" />
                <col class="w-[40%]" />
                <col class="w-10" />
                <col />
            </colgroup>
            <thead>
                <tr class="border-b border-gray-300 text-left">
                    <th class="py-2 pr-2 w-6"></th>
                    <th class="py-2 pr-2 text-xs font-bold uppercase tracking-wider text-gray-500">Tag</th>
                    <th class="py-2 pr-2 text-xs font-bold uppercase tracking-wider text-gray-500">Label</th>
                    <th class="py-2 pr-2 text-xs font-bold uppercase tracking-wider text-gray-500">Color</th>
                    <th class="py-2 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
            </thead>
            <tbody
                use:dragHandleZone={{ items: categories, flipDurationMs: 0, dropTargetStyle: {} }}
                onconsider={handleDndConsider}
                onfinalize={handleDndFinalize}
            >
                {#each categories as category, index (category.id)}
                    <tr
                        class="border-b border-gray-200 {category[SHADOW_ITEM_MARKER_PROPERTY_NAME]
                            ? 'opacity-40'
                            : ''}"
                    >
                        <td class="py-1.5 pr-1">
                            <span
                                use:dragHandle
                                class="block text-gray-400 hover:text-gray-600 select-none"
                                aria-label="Reorder"
                            >
                                ⋮⋮
                            </span>
                        </td>
                        <td class="py-1.5 pr-2">
                            <input
                                type="hidden"
                                name="tag"
                                value={category.tag}
                            />
                            <div
                                class="text-sm"
                                style="--sv-min-height: 34px"
                            >
                                <Svelecte
                                    options={rowTagOptions[index].map((tag) => ({ id: tag, text: tag }))}
                                    bind:value={category.tag}
                                    creatable
                                    creatablePrefix=""
                                    placeholder="restaurant"
                                    clearable
                                    createFilter={(value) => value.includes("#")}
                                    controlClass="!box-border !h-[34px] !min-h-[34px]"
                                />
                            </div>
                        </td>
                        <td class="py-1.5 pr-2">
                            <input
                                type="text"
                                name="label"
                                bind:value={category.label}
                                placeholder="Restaurant"
                                aria-label="Label"
                                class="w-full px-2 py-1.5 h-[34px] border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                            />
                        </td>
                        <td class="py-1.5 pr-2">
                            <input
                                type="color"
                                name="color"
                                bind:value={category.color}
                                aria-label="Color"
                                class="h-8 w-8 border border-gray-300 rounded-sm bg-white cursor-pointer"
                            />
                        </td>
                        <td class="py-1.5 text-right">
                            <button
                                type="button"
                                onclick={() => removeCategory(index)}
                                class="text-sm text-gray-400 hover:text-red-600 hover:underline cursor-pointer bg-transparent border-none"
                            >
                                Remove
                            </button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>

        <div class="flex items-center gap-3 mt-4">
            <button
                type="button"
                onclick={addCategory}
                class="px-3 py-1.5 bg-white text-blue-600 border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-50"
            >
                Add category
            </button>
            <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
            >
                Save categories
            </button>
        </div>
    </form>
</main>
