<script>
    import { formatTimelineEventDates } from "$lib/shared/timeline-event.js";
    import { createTimelineEvent, saveTimelineEvent } from "./timelineEvents.remote.js";

    /**
     * @typedef {{ id: number, type: "milestone" | "period", title: string, category: string | null, start_date: string, end_date: string | null, description: string | null }} TimelineEvent
     * @typedef {{ type: "milestone" | "period", title: string, category: string, start_date: string, end_date: string, description: string }} TimelineEventEditValues
     * @typedef {{ mode: "add", id: null, initial: TimelineEventEditValues, values: TimelineEventEditValues } | { mode: "edit", id: number, initial: TimelineEventEditValues, values: TimelineEventEditValues }} TimelineEventEditState
     */

    /** @type {{ events: TimelineEvent[], onSaved?: ((result: { events: TimelineEvent[] }) => void) | null }} */
    let { events, onSaved = null } = $props();

    /** @type {TimelineEventEditState | null} */
    let editing = $state(null);
    let saving = $state(false);
    /** @type {string | null} */
    let saveError = $state(null);
    // Set on mousedown of a clickable cell or the save/cancel buttons while an
    // edit is open: the ensuing blur would otherwise cancel that edit before the
    // click opens the new one or hits the button.
    let suppressBlurCancel = $state(false);
    /** @type {HTMLInputElement | undefined} */
    let titleInput = $state();

    /** @param {TimelineEvent} event */
    function startEdit(event) {
        const snapshot = {
            type: event.type,
            title: event.title ?? "",
            category: event.category ?? "",
            start_date: event.start_date ?? "",
            end_date: event.end_date ?? "",
            description: event.description ?? "",
        };
        editing = { mode: "edit", id: Number(event.id), initial: snapshot, values: { ...snapshot } };
        saveError = null;
    }

    // Opens the inline add row with an empty snapshot (default type: milestone).
    // Exported so the parent page can trigger it from its "Add event" link via
    // bind:this.
    export function startAdd() {
        const snapshot = /** @type {TimelineEventEditValues} */ ({
            type: "milestone",
            title: "",
            category: "",
            start_date: "",
            end_date: "",
            description: "",
        });
        editing = { mode: "add", id: null, initial: snapshot, values: { ...snapshot } };
        saveError = null;
    }

    function cancelEdit() {
        editing = null;
        saveError = null;
    }

    /** @param {KeyboardEvent} event */
    function handleEditKeydown(event) {
        if (event.key === "Enter" && !event.defaultPrevented) {
            event.preventDefault();
            save();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
        }
    }

    /** @param {FocusEvent & { currentTarget: HTMLElement }} event */
    function handleFocusOut(event) {
        if (suppressBlurCancel) {
            suppressBlurCancel = false;
            return;
        }
        if (saving) return;
        // Losing browser-window focus also emits focusout with no relatedTarget.
        // Keep the edit row open until the user explicitly resumes or cancels.
        if (!document.hasFocus()) return;
        const { relatedTarget } = event;
        if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
        cancelEdit();
    }

    /** @param {{ initial: TimelineEventEditValues, values: TimelineEventEditValues }} edit */
    function unchanged(edit) {
        return (
            edit.values.type === edit.initial.type &&
            edit.values.title === edit.initial.title &&
            edit.values.category === edit.initial.category &&
            edit.values.start_date === edit.initial.start_date &&
            edit.values.end_date === edit.initial.end_date &&
            edit.values.description === edit.initial.description
        );
    }

    /** @param {{ values: TimelineEventEditValues }} edit */
    function buildValues(edit) {
        return {
            type: edit.values.type,
            title: edit.values.title.trim(),
            category: edit.values.category || null,
            start_date: edit.values.start_date,
            end_date: edit.values.end_date || null,
            description: edit.values.description || null,
        };
    }

    async function save() {
        const edit = editing;
        if (!edit) return;
        if (edit.mode === "edit" && unchanged(edit)) {
            cancelEdit();
            return;
        }

        saving = true;
        saveError = null;
        try {
            const result =
                edit.mode === "add"
                    ? await createTimelineEvent({ values: buildValues(edit) })
                    : await saveTimelineEvent({ id: edit.id, values: buildValues(edit) });
            onSaved?.(result);
            cancelEdit();
        } catch (err) {
            // Remote command errors surface as a SvelteKit HttpError whose
            // `message` is undefined: the actual message lives in `body.message`.
            /** @type {any} */
            const thrown = err;
            saveError = thrown?.body?.message || thrown?.message || "Save failed";
        } finally {
            saving = false;
        }
    }

    $effect(() => {
        if (editing && !saving) titleInput?.focus();
    });
</script>

{#if events.length === 0}
    <p class="text-sm text-gray-500">No life events yet.</p>
{:else}
    <table class="w-full text-sm border-collapse">
        <thead>
            <tr class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-300">
                <th class="py-2 pr-4 whitespace-nowrap w-[1%]">Type</th>
                <th class="py-2 pr-4 whitespace-nowrap w-[1%]">Dates</th>
                <th class="py-2 pr-4 whitespace-nowrap w-[1%]">Category</th>
                <th class="py-2 pr-4">Title</th>
                <th class="py-2 text-right whitespace-nowrap w-[1%]">Actions</th>
            </tr>
        </thead>
        <tbody>
            {#if editing?.mode === "add"}
                <tr
                    class="bg-blue-50 border-y border-blue-300"
                    onkeydown={handleEditKeydown}
                    onfocusout={handleFocusOut}
                    onmousedown={() => (suppressBlurCancel = !!editing)}
                >
                    <td
                        colspan="5"
                        class="px-2 py-[7px] border-b border-gray-300 align-middle"
                    >
                        <div class="flex flex-col gap-[3px]">
                            <p class="text-[10px] font-bold text-blue-700 uppercase">New event or period</p>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                                <div class="flex flex-col">
                                    <label
                                        for="te-type"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase">Type</label
                                    >
                                    <select
                                        id="te-type"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.type}
                                        disabled={saving}
                                    >
                                        <option value="milestone">Milestone</option>
                                        <option value="period">Period</option>
                                    </select>
                                </div>
                                <div class="flex flex-col">
                                    <label
                                        for="te-title"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                        >Title <span class="text-red-500">required</span></label
                                    >
                                    <input
                                        id="te-title"
                                        bind:this={titleInput}
                                        type="text"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.title}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                                <div class="flex flex-col">
                                    <label
                                        for="te-category"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase">Category</label
                                    >
                                    <input
                                        id="te-category"
                                        type="text"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.category}
                                        disabled={saving}
                                    />
                                </div>
                                <div class="flex flex-col">
                                    <label
                                        for="te-start"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                        >{editing.values.type === "milestone" ? "Date" : "Start date"}
                                        <span class="text-red-500">required</span></label
                                    >
                                    <input
                                        id="te-start"
                                        type="date"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.start_date}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                                <div
                                    class="flex flex-col"
                                    class:invisible={editing.values.type === "milestone"}
                                >
                                    <label
                                        for="te-end"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase">End date</label
                                    >
                                    <input
                                        id="te-end"
                                        type="date"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.end_date}
                                        disabled={saving}
                                        title="Leave empty for a milestone or an ongoing period"
                                    />
                                </div>
                            </div>
                            <div class="flex items-end gap-2">
                                <div class="flex-1 flex flex-col">
                                    <label
                                        for="te-description"
                                        class="mt-1 text-[9px] text-gray-400 font-semibold uppercase">Description</label
                                    >
                                    <textarea
                                        id="te-description"
                                        rows="2"
                                        class="box-border w-full px-2 py-1.5 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.description}
                                        disabled={saving}></textarea>
                                </div>
                                <span class="flex items-center gap-2 pb-[1px] whitespace-nowrap">
                                    <button
                                        onclick={save}
                                        disabled={saving}
                                        onmousedown={() => (suppressBlurCancel = !!editing)}
                                        class="text-[12px] text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                                    >
                                        {saving ? "Creating…" : "Create"}
                                    </button>
                                    <button
                                        onclick={cancelEdit}
                                        disabled={saving}
                                        onmousedown={() => (suppressBlurCancel = !!editing)}
                                        class="text-[12px] text-gray-400 hover:text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                                    >
                                        cancel
                                    </button>
                                </span>
                            </div>
                            {#if saveError}
                                <span class="text-red-600 text-[11px]">{saveError}</span>
                            {/if}
                        </div>
                    </td>
                </tr>
            {/if}
            {#each events as event (event.id)}
                {#if editing?.id === event.id}
                    <tr
                        class="bg-blue-50 border-y border-blue-300"
                        onkeydown={handleEditKeydown}
                        onfocusout={handleFocusOut}
                        onmousedown={() => (suppressBlurCancel = !!editing)}
                    >
                        <td
                            colspan="5"
                            class="px-2 py-[7px] border-b border-gray-300 align-middle"
                        >
                            <div class="flex flex-col gap-[3px]">
                                <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                                    <div class="flex flex-col">
                                        <label
                                            for="te-type"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase">Type</label
                                        >
                                        <select
                                            id="te-type"
                                            class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.type}
                                            disabled={saving}
                                        >
                                            <option value="milestone">Milestone</option>
                                            <option value="period">Period</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            for="te-title"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                            >Title <span class="text-red-500">required</span></label
                                        >
                                        <input
                                            id="te-title"
                                            bind:this={titleInput}
                                            type="text"
                                            class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.title}
                                            disabled={saving}
                                            required
                                        />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            for="te-category"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                            >Category</label
                                        >
                                        <input
                                            id="te-category"
                                            type="text"
                                            class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.category}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div class="flex flex-col">
                                        <label
                                            for="te-start"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                            >{editing.values.type === "milestone" ? "Date" : "Start date"}
                                            <span class="text-red-500">required</span></label
                                        >
                                        <input
                                            id="te-start"
                                            type="date"
                                            class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.start_date}
                                            disabled={saving}
                                            required
                                        />
                                    </div>
                                    <div
                                        class="flex flex-col"
                                        class:invisible={editing.values.type === "milestone"}
                                    >
                                        <label
                                            for="te-end"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                            >End date</label
                                        >
                                        <input
                                            id="te-end"
                                            type="date"
                                            class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.end_date}
                                            disabled={saving}
                                            title="Leave empty for a milestone or an ongoing period"
                                        />
                                    </div>
                                </div>
                                <div class="flex items-end gap-2">
                                    <div class="flex-1 flex flex-col">
                                        <label
                                            for="te-description"
                                            class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                            >Description</label
                                        >
                                        <textarea
                                            id="te-description"
                                            rows="2"
                                            class="box-border w-full px-2 py-1.5 text-[12px] border border-gray-300 rounded bg-white"
                                            bind:value={editing.values.description}
                                            disabled={saving}></textarea>
                                    </div>
                                    <span class="flex items-center gap-2 pb-[1px] whitespace-nowrap">
                                        <button
                                            onclick={save}
                                            disabled={saving}
                                            onmousedown={() => (suppressBlurCancel = !!editing)}
                                            class="text-[12px] text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                                        >
                                            {saving ? "Saving…" : "save"}
                                        </button>
                                        <button
                                            onclick={cancelEdit}
                                            disabled={saving}
                                            onmousedown={() => (suppressBlurCancel = !!editing)}
                                            class="text-[12px] text-gray-400 hover:text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                                        >
                                            cancel
                                        </button>
                                    </span>
                                </div>
                                {#if saveError}
                                    <span class="text-red-600 text-[11px]">{saveError}</span>
                                {/if}
                            </div>
                        </td>
                    </tr>
                {:else}
                    <tr class="border-b border-gray-200">
                        <td
                            class="py-2 pr-4 capitalize cursor-pointer whitespace-nowrap w-[1%]"
                            onclick={() => startEdit(event)}
                            onmousedown={() => (suppressBlurCancel = !!editing)}>{event.type}</td
                        >
                        <td
                            class="py-2 pr-4 cursor-pointer whitespace-nowrap w-[1%]"
                            onclick={() => startEdit(event)}
                            onmousedown={() => (suppressBlurCancel = !!editing)}>{formatTimelineEventDates(event)}</td
                        >
                        <td
                            class="py-2 pr-4 cursor-pointer whitespace-nowrap w-[1%]"
                            onclick={() => startEdit(event)}
                            onmousedown={() => (suppressBlurCancel = !!editing)}>{event.category ?? "—"}</td
                        >
                        <td
                            class="py-2 pr-4 cursor-pointer"
                            onclick={() => startEdit(event)}
                            onmousedown={() => (suppressBlurCancel = !!editing)}>{event.title}</td
                        >
                        <td class="py-2 text-right whitespace-nowrap w-[1%]">
                            <button
                                type="button"
                                onclick={() => startEdit(event)}
                                class="text-sm text-blue-600 hover:underline mr-3 cursor-pointer bg-transparent border-none"
                            >
                                Edit
                            </button>
                            <form
                                method="POST"
                                action="?/delete"
                                class="inline"
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={event.id}
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
                {/if}
            {/each}
        </tbody>
    </table>
{/if}
