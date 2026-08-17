<script>
    /* eslint-disable svelte/prefer-svelte-reactivity -- new Date() used in ephemeral formatting functions, not reactive state */

    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { saveTimeEntry } from "./timeEntries.remote.js";
    import InputTags from "./input-tags/InputTags.svelte";
    import { getAllTags } from "./tags.remote.js";
    import { fuzzyMatch } from "./fuzzyMatch.js";

    let {
        entries = [],
        selectedIds = $bindable(new Set()),
        selectAllMatching = $bindable(false),
        sort = "asc",
        prevPageHref = null,
        nextPageHref = null,
        total = null,
        hasFilter = false,
        view = null,
        onSaved = null,
    } = $props();

    let leftLabel = $derived(sort === "asc" ? "Older" : "Newer");
    let rightLabel = $derived(sort === "asc" ? "Newer" : "Older");
    let hasTopNav = $derived(!!prevPageHref || !!nextPageHref);

    /** @type {{ id: number, initial: { description: string, tags: string[], startedAtTxt: string, endedAtTxt: string }, values: { description: string, tags: string[], startedAtTxt: string, endedAtTxt: string } } | null} */
    let editing = $state(null);
    let saving = $state(false);
    /** @type {string | null} */
    let saveError = $state(null);
    /** @type {number | null} */
    let movedOutId = $state(null);
    // Set on mousedown of an editable cell while an edit is open: the ensuing
    // blur would otherwise cancel that edit before the click opens the new one.
    let suppressBlurCancel = $state(false);
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let movedOutTimer;
    /** @type {HTMLInputElement | undefined} */
    let descriptionInput;

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
        return `${h}h${m}m`;
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
        const get = (part) => parts.find((p) => p.type === part).value;
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

    function setSelection(next, allMatching = false) {
        selectedIds = next;
        selectAllMatching = allMatching;
        const url = new URL($page.url);
        if (allMatching) {
            url.searchParams.set("selected", "all");
        } else if (next.size > 0) {
            url.searchParams.set("selected", [...next].join(","));
        } else {
            url.searchParams.delete("selected");
        }
        goto(url, { replaceState: true, noScroll: true, keepFocus: true });
    }

    // Switches the whole selection to "every entry matching the current filter".
    function selectAllMatchingEntries() {
        setSelection(new Set(), true);
    }

    // Leaves "all matching" mode and keeps only the entries displayed on this page.
    function selectOnlyThisPage() {
        setSelection(new Set(entries.map((e) => Number(e.id))));
    }

    function toggleEntry(id) {
        id = Number(id);
        if (selectAllMatching) {
            // Refinement: leave "all matching" and deselect just this row.
            const next = new Set(entries.map((e) => Number(e.id)));
            next.delete(id);
            setSelection(next);
            return;
        }
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelection(next);
    }

    function toggleGroup(groupEntries) {
        const ids = groupEntries.map((e) => Number(e.id));
        if (selectAllMatching) {
            // Refinement: leave "all matching" and deselect this whole group.
            const next = new Set(entries.map((e) => Number(e.id)));
            ids.forEach((id) => next.delete(id));
            setSelection(next);
            return;
        }
        const allSelected = ids.every((id) => selectedIds.has(id));
        const next = new Set(selectedIds);
        if (allSelected) {
            ids.forEach((id) => next.delete(id));
        } else {
            ids.forEach((id) => next.add(id));
        }
        setSelection(next);
    }

    function toggleAll() {
        if (selectAllMatching) {
            // Clicking the checked header checkbox clears the whole selection.
            setSelection(new Set());
            return;
        }
        const allIds = entries.map((e) => Number(e.id));
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
        const next = new Set(selectedIds);
        if (allSelected) {
            allIds.forEach((id) => next.delete(id));
        } else {
            allIds.forEach((id) => next.add(id));
        }
        setSelection(next);
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
        const selected = entries.filter((e) => selectedIds.has(Number(e.id)));
        navigator.clipboard.writeText(generateText(selected, format));
        copiedFormat = format;
        setTimeout(() => {
            copiedFormat = null;
        }, 2000);
    }

    // Number of entries matching the current filter (the `total` from the SQL
    // payload); falls back to the page size when the server did not provide it.
    let matchingCount = $derived(total !== null ? Number(total) : entries.length);
    let matchingLabel = $derived(hasFilter ? "matching entries" : "entries");
    let someSelected = $derived(selectedIds.size > 0 || selectAllMatching);
    let allSelected = $derived(
        selectAllMatching || (entries.length > 0 && entries.every((e) => selectedIds.has(Number(e.id)))),
    );
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

    function startEdit(entry) {
        if (!view) return;
        const snapshot = {
            description: entry.description ?? "",
            tags: [...(entry.tags || [])],
            startedAtTxt: formatDate(entry.started_at),
            endedAtTxt: entry.ended_at ? formatDate(entry.ended_at) : "",
        };
        editing = { id: entry.id, initial: snapshot, values: { ...snapshot } };
        saveError = null;
    }

    function cancelEdit() {
        editing = null;
        saveError = null;
    }

    function handleEditKeydown(event) {
        if (event.key === "Enter" && !event.defaultPrevented) {
            event.preventDefault();
            save();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
        }
    }

    function handleFocusOut(event) {
        if (suppressBlurCancel) {
            suppressBlurCancel = false;
            return;
        }
        if (saving) return;
        // Losing browser-window focus also emits focusout with no relatedTarget.
        // Keep the edit panel open until the user explicitly resumes or cancels.
        if (!document.hasFocus()) return;
        if (event.currentTarget.contains(event.relatedTarget)) return;
        cancelEdit();
    }

    function buildChanges() {
        const changes = {};
        if (editing.values.description !== editing.initial.description) {
            changes.description = editing.values.description;
        }
        if (JSON.stringify(editing.values.tags) !== JSON.stringify(editing.initial.tags)) {
            changes.tags = editing.values.tags;
        }
        if (editing.values.startedAtTxt !== editing.initial.startedAtTxt) {
            changes.started_at = editing.values.startedAtTxt;
        }
        if (editing.values.endedAtTxt !== editing.initial.endedAtTxt) {
            changes.ended_at = editing.values.endedAtTxt === "" ? null : editing.values.endedAtTxt;
        }
        return changes;
    }

    async function save() {
        const id = editing.id;
        const changes = buildChanges();
        if (Object.keys(changes).length === 0) {
            cancelEdit();
            return;
        }

        saving = true;
        saveError = null;
        try {
            const result = await saveTimeEntry({ id, changes, view });
            const stillVisible = result.entries.some((e) => String(e.id) === String(id));
            if (!stillVisible) {
                movedOutId = id;
                clearTimeout(movedOutTimer);
                movedOutTimer = setTimeout(() => {
                    movedOutId = null;
                }, 2000);
            }
            onSaved?.(result);
            cancelEdit();
        } catch (err) {
            saveError = err.message || "Save failed";
        } finally {
            saving = false;
        }
    }

    $effect(() => {
        if (editing && !saving) descriptionInput?.focus();
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
                {#if selectAllMatching}
                    All {matchingCount.toLocaleString("en")} {matchingLabel} selected
                {:else if selectedIds.size > 0}
                    {selectedIds.size} selected on this page
                {:else}
                    Select all
                {/if}
            </span>
            {#if total !== null}
                <span class="text-[12px] text-gray-400">
                    {#if hasFilter}
                        {#if entries.length < total}
                            {entries.length} shown · {total.toLocaleString("en")} match current filters
                        {:else}
                            {total.toLocaleString("en")} match current filters
                        {/if}
                    {:else}
                        {#if entries.length < total}
                            {entries.length} of {total.toLocaleString("en")} entries
                        {:else}
                            {total.toLocaleString("en")} entries
                        {/if}
                    {/if}
                </span>
            {/if}
            {#if movedOutId !== null}
                <span class="text-blue-600 italic text-[12px]">Entry #{movedOutId} moved to another period/day</span>
            {/if}
            {#if selectAllMatching}
                <button
                    onclick={selectOnlyThisPage}
                    class="text-[12px] text-indigo-600 underline underline-offset-2 hover:text-indigo-800 cursor-pointer"
                >
                    Select only the {entries.length} on this page
                </button>
            {:else if selectedIds.size > 0 && matchingCount > entries.length}
                <button
                    onclick={selectAllMatchingEntries}
                    class="text-[12px] text-indigo-600 underline underline-offset-2 hover:text-indigo-800 cursor-pointer"
                >
                    Select all {matchingCount.toLocaleString("en")}
                    {matchingLabel}
                </button>
            {/if}
        </div>
        {#if false}
            <div class="absolute inset-x-0 top-full z-10 border-b border-gray-300 bg-white px-3 py-3 text-sm">
                <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
                    <div class="min-w-[220px] flex-1">
                        <label
                            for="bulk-description"
                            class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                        >
                            Description
                        </label>
                        <input
                            id="bulk-description"
                            type="text"
                            class="box-border h-[30px] w-full rounded border border-gray-300 bg-white px-2 text-[12px]"
                            placeholder="Replace description for all selected entries"
                            disabled
                        />
                    </div>
                    <div class="min-w-[180px] flex-1">
                        <label
                            for="bulk-add-tags"
                            class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                        >
                            Add tags
                        </label>
                        <input
                            id="bulk-add-tags"
                            type="text"
                            class="box-border h-[30px] w-full rounded border border-gray-300 bg-white px-2 text-[12px]"
                            placeholder="tag1, tag2, …"
                            disabled
                        />
                    </div>
                    <div class="min-w-[180px] flex-1">
                        <label
                            for="bulk-remove-tags"
                            class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                        >
                            Remove tags
                        </label>
                        <input
                            id="bulk-remove-tags"
                            type="text"
                            class="box-border h-[30px] w-full rounded border border-gray-300 bg-white px-2 text-[12px]"
                            placeholder="tag1, tag2, …"
                            disabled
                        />
                    </div>
                    <div class="flex items-end gap-2 pb-[1px]">
                        <button
                            type="button"
                            class="h-[30px] rounded border border-gray-300 px-3 text-[12px] text-gray-400"
                            disabled
                        >
                            Apply changes
                        </button>
                        <button
                            type="button"
                            class="h-[30px] px-1 text-[12px] text-gray-400"
                            disabled
                        >
                            cancel
                        </button>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-1 border-t border-gray-200 pt-2">
                    <span class="text-gray-500 select-none">Copy selected as</span>
                    {#if copiedFormat}
                        <span class="text-green-600">{formatLabels[copiedFormat]} copied!</span>
                    {:else}
                        {#each Object.entries(formatLabels) as [format, label], i (format)}
                            {#if i > 0}<span class="text-gray-300">|</span>{/if}
                            <button
                                onclick={() => copySelected(format)}
                                class="text-indigo-600 underline underline-offset-2 hover:text-indigo-800 cursor-pointer"
                                >{label}</button
                            >
                        {/each}
                    {/if}
                </div>
            </div>
        {:else if selectedIds.size === 1}
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
                {#if prevPageHref}
                    <a
                        href={prevPageHref}
                        class="text-blue-600 no-underline hover:underline">‹ {leftLabel}</a
                    >
                {:else}
                    <span class="text-gray-400">‹ {leftLabel}</span>
                {/if}
                <span class="text-gray-300">·</span>
                {#if nextPageHref}
                    <a
                        href={nextPageHref}
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
        <table class="w-full table-auto border-collapse text-[14px]">
            <thead>
                <tr class="bg-gray-50">
                    <th
                        colspan="2"
                        class="px-2 py-[7px] border-b-2 border-gray-300 rounded-tl"
                    >
                        <div class="flex items-center gap-2 whitespace-nowrap">
                            <input
                                type="checkbox"
                                class="w-4 h-4"
                                checked={selectAllMatching || group.entries.every((e) => selectedIds.has(Number(e.id)))}
                                use:isIndeterminate={!selectAllMatching &&
                                    group.entries.some((e) => selectedIds.has(Number(e.id))) &&
                                    !group.entries.every((e) => selectedIds.has(Number(e.id)))}
                                onchange={() => toggleGroup(group.entries)}
                            />
                            <span class="text-sm font-bold">{dayLabel(group.date)}</span>
                        </div>
                    </th>
                    <th class="px-2 py-[7px] border-b-2 border-gray-300 text-left">
                        <span class="text-sm text-gray-500">Total duration</span>
                        <span class="text-sm font-mono text-gray-500">{formatPeriodDuration(group.totalSeconds)}</span>
                    </th>
                    <th class="border-b-2 border-gray-300 rounded-tr"></th>
                </tr>
                <tr>
                    <th class="w-[1px] px-2 py-[7px] border-b-2 border-gray-300"></th>
                    <th
                        class="w-[1px] whitespace-normal px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Time / Duration
                    </th>
                    <th
                        class="w-3/5 px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Description
                    </th>
                    <th
                        class="w-2/5 whitespace-normal px-2 py-[7px] border-b-2 border-gray-300 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                        Tags
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each group.entries as entry (entry.id)}
                    {#if editing?.id === entry.id}
                        <tr
                            class="bg-blue-50 border-y border-blue-300"
                            onkeydown={handleEditKeydown}
                            onfocusout={handleFocusOut}
                        >
                            <td class="w-[1px] px-2 py-[7px] border-b border-gray-300 align-middle">
                                <input
                                    type="checkbox"
                                    class="w-4 h-4"
                                    checked={selectAllMatching || selectedIds.has(Number(entry.id))}
                                    onchange={() => toggleEntry(entry.id)}
                                    disabled={saving}
                                />
                            </td>
                            <td
                                colspan="3"
                                class="px-2 py-[7px] border-b border-gray-300 align-middle"
                            >
                                <div class="flex flex-col gap-[3px]">
                                    <label class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                        >Description</label
                                    >
                                    <input
                                        bind:this={descriptionInput}
                                        type="text"
                                        class="box-border h-[30px] w-full px-2 text-[12px] border border-gray-300 rounded bg-white"
                                        bind:value={editing.values.description}
                                        disabled={saving}
                                        placeholder="(no description)"
                                    />
                                    <div class="flex items-end gap-2">
                                        <div class="flex-1 flex flex-col">
                                            <label class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                                >Tags</label
                                            >
                                            <InputTags
                                                bind:value={editing.values.tags}
                                                tags={getAllTags}
                                                matchTags={fuzzyMatch}
                                                disabled={saving}
                                                placeholder="#tagname"
                                            />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                                >Started</label
                                            >
                                            <input
                                                type="text"
                                                class="box-border h-[30px] w-[190px] px-2 text-[12px] font-mono border border-gray-300 rounded bg-white"
                                                bind:value={editing.values.startedAtTxt}
                                                disabled={saving}
                                                title="YYYY-MM-DD HH:MM[:SS] (Europe/Paris)"
                                            />
                                        </div>
                                        <div class="flex flex-col">
                                            <label class="mt-1 text-[9px] text-gray-400 font-semibold uppercase"
                                                >Ended</label
                                            >
                                            <input
                                                type="text"
                                                class="box-border h-[30px] w-[190px] px-2 text-[12px] font-mono border border-gray-300 rounded bg-white"
                                                bind:value={editing.values.endedAtTxt}
                                                disabled={saving}
                                                placeholder="running"
                                                title="YYYY-MM-DD HH:MM[:SS] — leave empty for running"
                                            />
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
                        <tr
                            class="group hover:bg-gray-100"
                            class:bg-blue-50={selectAllMatching || selectedIds.has(Number(entry.id))}
                        >
                            <td class="w-[1px] px-2 py-[7px] border-b border-gray-300 align-middle">
                                <input
                                    type="checkbox"
                                    class="w-4 h-4"
                                    checked={selectAllMatching || selectedIds.has(Number(entry.id))}
                                    onchange={() => toggleEntry(entry.id)}
                                />
                            </td>
                            <td
                                class="w-[1px] whitespace-nowrap px-2 py-[7px] border-b border-gray-300 align-middle text-[13px] cursor-pointer"
                                onclick={() => startEdit(entry)}
                                onmousedown={() => (suppressBlurCancel = !!editing)}
                            >
                                <div class="flex items-baseline gap-2 justify-start whitespace-nowrap">
                                    <span class="text-gray-500"
                                        >{formatTimeRange(entry.started_at, entry.ended_at)}</span
                                    >
                                    <span
                                        class="font-mono font-semibold"
                                        class:text-green-700={!entry.ended_at}
                                        >{formatDuration(entry.started_at, entry.ended_at)}</span
                                    >
                                </div>
                            </td>
                            <td
                                class="w-3/5 px-2 py-[7px] border-b border-gray-300 align-middle cursor-pointer"
                                onclick={() => startEdit(entry)}
                                onmousedown={() => (suppressBlurCancel = !!editing)}
                            >
                                <span class="flex items-center justify-between gap-2">
                                    <span class="min-w-0">
                                        {#if entry.description}
                                            {entry.description}
                                        {:else}
                                            <span class="text-gray-500 italic">(no description)</span>
                                        {/if}
                                    </span>
                                    <button
                                        type="button"
                                        class="shrink-0 text-blue-600 text-[11px] no-underline opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                                        aria-label="Edit time entry"
                                        title="Edit time entry"
                                        onclick={(event) => {
                                            event.stopPropagation();
                                            startEdit(entry);
                                        }}>edit entry</button
                                    >
                                </span>
                            </td>
                            <td
                                class="w-2/5 whitespace-normal px-2 py-[7px] border-b border-gray-300 align-middle cursor-pointer"
                                onclick={() => startEdit(entry)}
                                onmousedown={() => (suppressBlurCancel = !!editing)}
                            >
                                {#each entry.tags as tag (tag)}
                                    <span
                                        class="inline-block text-[11px] text-gray-500 border border-gray-300 rounded px-[5px] mr-[3px] whitespace-nowrap"
                                        onclick={(event) => event.stopPropagation()}>{tag}</span
                                    >
                                {/each}
                            </td>
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    </div>
{:else}
    <p class="text-gray-500 italic py-6">No entries yet.</p>
{/each}
