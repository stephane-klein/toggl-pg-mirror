<script>
    /* eslint-disable svelte/prefer-svelte-reactivity -- new Date() used in ephemeral formatting functions, not reactive state */

    let { entries = [], selectedIds = $bindable(new Set()) } = $props();

    function dayLabel(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
        const fmt = `${weekday}, ${y}-${m}-${d}`;

        if (date.toDateString() === today.toDateString()) return `Today — ${fmt}`;
        if (date.toDateString() === yesterday.toDateString()) return `Yesterday — ${fmt}`;
        return fmt;
    }

    function formatDuration(startedAt, endedAt) {
        const end = endedAt ? new Date(endedAt) : new Date();
        const diff = Math.floor((end - new Date(startedAt)) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function formatPeriodDuration(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        if (h === 0) return `${m}m`;
        return `${h}h ${m}m`;
    }

    function formatTimeRange(startedAt, endedAt) {
        const opts = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Paris" };
        const start = new Date(startedAt).toLocaleTimeString("en-US", opts);
        if (!endedAt) return `${start} – running`;
        const end = new Date(endedAt).toLocaleTimeString("en-US", opts);
        return `${start} – ${end}`;
    }

    function isIndeterminate(node, param) {
        node.indeterminate = param;
        return {
            update(param) {
                node.indeterminate = param;
            },
        };
    }

    function toggleEntry(id) {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        selectedIds = next;
    }

    function toggleGroup(groupEntries) {
        const ids = groupEntries.map((e) => e.id);
        const allSelected = ids.every((id) => selectedIds.has(id));
        const next = new Set(selectedIds);
        if (allSelected) {
            ids.forEach((id) => next.delete(id));
        } else {
            ids.forEach((id) => next.add(id));
        }
        selectedIds = next;
    }

    function toggleAll() {
        const allIds = entries.map((e) => e.id);
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
        const next = new Set(selectedIds);
        if (allSelected) {
            allIds.forEach((id) => next.delete(id));
        } else {
            allIds.forEach((id) => next.add(id));
        }
        selectedIds = next;
    }

    let copied = $state(false);
    let copiedText = $derived(copied ? "Copied!" : "Copy selected as JSON");

    function copySelectedAsJson() {
        const selected = entries.filter((e) => selectedIds.has(e.id));
        navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 2000);
    }

    let someSelected = $derived(selectedIds.size > 0);
    let allSelected = $derived(entries.length > 0 && entries.every((e) => selectedIds.has(e.id)));
    let globalIndeterminate = $derived(someSelected && !allSelected);

    let dayGroups = $derived.by(() => {
        const map = {};
        for (const entry of entries) {
            const day = new Date(entry.started_at).toDateString();
            if (!map[day]) map[day] = { date: day, entries: [], totalSeconds: 0 };
            map[day].entries.push(entry);
            const end = entry.ended_at ? new Date(entry.ended_at) : new Date();
            map[day].totalSeconds += Math.floor((end - new Date(entry.started_at)) / 1000);
        }
        return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date));
    });
</script>

{#if entries.length > 0}
    <div class="relative flex items-center py-2 px-2 border-b border-gray-300">
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                class="w-4 h-4"
                checked={allSelected}
                use:isIndeterminate={globalIndeterminate}
                onchange={toggleAll}
            />
            <span class="text-sm text-gray-600">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
        </div>
        {#if selectedIds.size > 0}
            <div class="absolute left-1/2 -translate-x-1/2">
                <button
                    onclick={copySelectedAsJson}
                    class="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2 whitespace-nowrap"
                >
                    {copiedText}
                </button>
            </div>
        {/if}
    </div>
{/if}

{#each dayGroups as group, i (group.date)}
    <div class:mt-6={i > 0}>
        <div class="flex items-baseline justify-between py-[7px] px-2 border-b-2 border-gray-300 bg-gray-50 rounded-t">
            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    class="w-4 h-4"
                    checked={group.entries.every((e) => selectedIds.has(e.id))}
                    use:isIndeterminate={group.entries.some((e) => selectedIds.has(e.id)) &&
                        !group.entries.every((e) => selectedIds.has(e.id))}
                    onchange={() => toggleGroup(group.entries)}
                />
                <span class="text-sm font-bold">{dayLabel(group.date)}</span>
            </div>
            <span class="text-sm font-mono text-gray-500">{formatPeriodDuration(group.totalSeconds)}</span>
        </div>

        <table class="w-full border-collapse text-[14px]">
            <thead>
                <tr>
                    <th class="w-[48px] px-2 py-[7px] border-b-2 border-gray-300"></th>
                    <th
                        class="px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Description
                    </th>
                    <th
                        class="px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Tags
                    </th>
                    <th
                        class="px-2 py-[7px] border-b-2 border-gray-300 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Time / Duration
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each group.entries as entry (entry.id)}
                    <tr
                        class="hover:bg-gray-100"
                        class:bg-blue-50={selectedIds.has(entry.id)}
                    >
                        <td class="w-[48px] px-2 py-[7px] border-b border-gray-300 align-middle">
                            <input
                                type="checkbox"
                                class="w-4 h-4"
                                checked={selectedIds.has(entry.id)}
                                onchange={() => toggleEntry(entry.id)}
                            />
                        </td>
                        <td class="px-2 py-[7px] border-b border-gray-300 align-middle">
                            {#if entry.description}
                                {entry.description}
                            {:else}
                                <span class="text-gray-500 italic">(no description)</span>
                            {/if}
                        </td>
                        <td class="px-2 py-[7px] border-b border-gray-300 align-middle">
                            {#each entry.tags as tag (tag)}
                                <span
                                    class="inline-block text-[11px] text-gray-500 border border-gray-300 rounded px-[5px] mr-[3px] whitespace-nowrap"
                                    >{tag}</span
                                >
                            {/each}
                        </td>
                        <td class="px-2 py-[7px] border-b border-gray-300 align-middle text-[13px]">
                            <div class="flex items-baseline gap-6 justify-end">
                                <span class="text-gray-500">{formatTimeRange(entry.started_at, entry.ended_at)}</span>
                                <span
                                    class="font-mono font-semibold"
                                    class:text-green-700={!entry.ended_at}
                                    >{formatDuration(entry.started_at, entry.ended_at)}</span
                                >
                            </div>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{:else}
    <p class="text-gray-500 italic py-6">No entries yet.</p>
{/each}
