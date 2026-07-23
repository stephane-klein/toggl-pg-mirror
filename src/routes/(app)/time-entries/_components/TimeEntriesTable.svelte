<script>
    /* eslint-disable svelte/prefer-svelte-reactivity -- new Date() used in ephemeral formatting functions, not reactive state */

    let {
        entries = [],
        selectedIds = $bindable(new Set()),
        sort = "asc",
        prevCursor = null,
        nextCursor = null,
        limit = 25,
        baseQuery = "",
    } = $props();

    let leftCursor = $derived(sort === "asc" ? nextCursor : prevCursor);
    let rightCursor = $derived(sort === "asc" ? prevCursor : nextCursor);
    let leftParam = $derived(sort === "asc" ? "before" : "after");
    let rightParam = $derived(sort === "asc" ? "after" : "before");
    let leftLabel = $derived(sort === "asc" ? "Older" : "Newer");
    let rightLabel = $derived(sort === "asc" ? "Newer" : "Older");
    let hasTopNav = $derived(prevCursor || nextCursor);

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

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        const parts = new Intl.DateTimeFormat("en", {
            timeZone: "Europe/Paris",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(d);
        const get = (type) => parts.find((p) => p.type === type).value;
        return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
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

    import * as yaml from "js-yaml";

    const formatLabels = {
        json: "JSON",
        yaml: "YAML",
        tsv: "TSV",
        "md-items": "MD items",
        "md-table": "MD table",
    };

    let copiedFormat = $state(null);

    function durationSeconds(startedAt, endedAt) {
        const end = endedAt ? new Date(endedAt) : new Date();
        return Math.floor((end - new Date(startedAt)) / 1000);
    }

    function generateText(selected, format) {
        const exportEntries = selected.map((e) => ({
            id: e.id,
            description: e.description,
            tags: e.tags,
            started_at: formatDate(e.started_at),
            ended_at: e.ended_at ? formatDate(e.ended_at) : null,
            duration_seconds: durationSeconds(e.started_at, e.ended_at),
        }));

        switch (format) {
            case "json":
                return JSON.stringify(exportEntries, null, 2);
            case "yaml":
                return yaml.dump(exportEntries);
            case "tsv": {
                const headers = ["id", "description", "tags", "started_at", "ended_at", "duration_seconds"];
                const rows = exportEntries.map((e) =>
                    [
                        e.id,
                        (e.description || "").replace(/\t/g, " "),
                        (e.tags || []).join(","),
                        e.started_at,
                        e.ended_at || "",
                        e.duration_seconds,
                    ].join("\t"),
                );
                return [headers.join("\t"), ...rows].join("\n");
            }
            case "md-items":
                return exportEntries
                    .map((e) => {
                        const desc = e.description || "(no description)";
                        const tags = (e.tags || []).join(", ");
                        const dur = formatDuration(e.started_at, e.ended_at);
                        let line = `- **${desc}** — ${e.started_at}`;
                        line += e.ended_at ? ` – ${e.ended_at}` : " – running";
                        line += ` _(duration: ${dur})_`;
                        if (tags) line += ` — ${tags}`;
                        return line;
                    })
                    .join("\n");
            case "md-table": {
                const header = "| Description | Tags | Started at | Ended at | Duration (seconds) |";
                const sep = "| --- | --- | --- | --- | --- |";
                const rows = exportEntries.map((e) => {
                    const desc = (e.description || "(no description)").replace(/\|/g, "\\|");
                    const tags = (e.tags || []).join(", ").replace(/\|/g, "\\|");
                    const ended = e.ended_at || "running";
                    return `| ${desc} | ${tags} | ${e.started_at} | ${ended} | ${e.duration_seconds} |`;
                });
                return [header, sep, ...rows].join("\n");
            }
        }
    }

    function copySelected(format) {
        const selected = entries.filter((e) => selectedIds.has(e.id));
        navigator.clipboard.writeText(generateText(selected, format));
        copiedFormat = format;
        setTimeout(() => {
            copiedFormat = null;
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
        return Object.values(map).sort((a, b) => {
            const diff = new Date(b.date) - new Date(a.date);
            return sort === "desc" ? diff : -diff;
        });
    });
</script>

{#if entries.length > 0}
    <div class="relative flex items-center py-2 px-2 border-b border-gray-300">
        <div class="flex items-center gap-2 flex-1">
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
            <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 text-sm">
                {#if copiedFormat}
                    <span class="text-green-600">{formatLabels[copiedFormat]} copied!</span>
                {:else}
                    <span class="text-gray-500 select-none">Copy selected as</span>
                    <button
                        onclick={() => copySelected("json")}
                        class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                        >JSON</button
                    >
                    <span class="text-gray-300">|</span>
                    <button
                        onclick={() => copySelected("yaml")}
                        class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                        >YAML</button
                    >
                    <span class="text-gray-300">|</span>
                    <button
                        onclick={() => copySelected("tsv")}
                        class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                        >TSV</button
                    >
                    <span class="text-gray-300">|</span>
                    <button
                        onclick={() => copySelected("md-items")}
                        class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                        >MD items</button
                    >
                    <span class="text-gray-300">|</span>
                    <button
                        onclick={() => copySelected("md-table")}
                        class="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                        >MD table</button
                    >
                {/if}
            </div>
        {/if}
        {#if hasTopNav}
            <nav class="ml-auto flex items-center gap-3 text-[12px]">
                <span class="text-[11px] text-gray-400">Page</span>
                {#if leftCursor}
                    <a
                        href="?{baseQuery
                            ? `${baseQuery}&limit=${limit}&${leftParam}=${leftCursor}`
                            : `limit=${limit}&${leftParam}=${leftCursor}`}"
                        class="text-blue-600 no-underline hover:underline">‹ {leftLabel}</a
                    >
                {:else}
                    <span class="text-gray-400">‹ {leftLabel}</span>
                {/if}
                <span class="text-gray-300">·</span>
                {#if rightCursor}
                    <a
                        href="?{baseQuery
                            ? `${baseQuery}&limit=${limit}&${rightParam}=${rightCursor}`
                            : `limit=${limit}&${rightParam}=${rightCursor}`}"
                        class="text-blue-600 no-underline hover:underline">{rightLabel} ›</a
                    >
                {:else}
                    <span class="text-gray-400">{rightLabel} ›</span>
                {/if}
            </nav>
        {/if}
    </div>
{/if}

{#each dayGroups as group, i (group.date)}
    <div class:mt-4={i > 0}>
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

        <table class="w-full table-fixed border-collapse text-[14px]">
            <thead>
                <tr>
                    <th class="w-[48px] px-2 py-[7px] border-b-2 border-gray-300"></th>
                    <th
                        class="w-1/2 px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Description
                    </th>
                    <th
                        class="w-1/4 px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Tags
                    </th>
                    <th
                        class="w-1/4 px-2 py-[7px] border-b-2 border-gray-300 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
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
                            <div class="flex items-baseline gap-4 justify-end">
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
