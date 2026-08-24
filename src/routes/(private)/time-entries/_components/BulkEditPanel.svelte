<script>
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import * as yaml from "js-yaml";
    import { bulkEditTimeEntries, getMatchingTimeEntries } from "./timeEntries.remote.js";
    import { pendingUndo, UNDO_WINDOW_MS } from "./undoStore.js";
    import InputTags from "./input-tags/InputTags.svelte";
    import { getAllTags } from "./tags.remote.js";
    import { fuzzyMatch } from "./fuzzyMatch.js";

    let {
        entries = [],
        selectedIds = $bindable(new Set()),
        selectAllMatching = $bindable(false),
        view = null,
    } = $props();

    const formatLabels = {
        json: "JSON",
        yaml: "YAML",
        tsv: "TSV",
        "md-items": "MD items",
        "md-table": "MD table",
    };

    let copiedFormat = $state(null);
    let description = $state("");
    let addTags = $state([]);
    let removeTags = $state([]);
    let saving = $state(false);
    let saveError = $state(null);

    let hasChanges = $derived(description !== "" || addTags.length > 0 || removeTags.length > 0);

    async function cancel() {
        selectedIds = new Set();
        selectAllMatching = false;
        const url = new URL($page.url);
        url.searchParams.delete("selected");
        await goto(url, { replaceState: true, noScroll: true, keepFocus: true });
    }

    function handleKeydown(event) {
        if (event.key === "Enter" && !event.defaultPrevented && hasChanges && !saving) {
            event.preventDefault();
            applyChanges();
        }
    }

    async function applyChanges() {
        const changes = {};
        if (description !== "") changes.description = description;
        if (addTags.length > 0) changes.addTags = addTags;
        if (removeTags.length > 0) changes.removeTags = removeTags;
        if (Object.keys(changes).length === 0 || !view) return;

        saving = true;
        saveError = null;
        try {
            const result = await bulkEditTimeEntries({ ids: [...selectedIds], selectAllMatching, changes, view });
            if (result.operationId) {
                pendingUndo.set({
                    operationId: result.operationId,
                    count: result.updatedCount,
                    expiresAt: Date.now() + UNDO_WINDOW_MS,
                });
            } else {
                pendingUndo.set(null);
            }
            selectedIds = new Set();
            selectAllMatching = false;
            const url = new URL($page.url);
            url.searchParams.delete("selected");
            await goto(url, { replaceState: true, noScroll: true, keepFocus: true });
        } catch (error) {
            saveError = error.message || "Bulk edit failed";
        } finally {
            saving = false;
        }
    }

    function durationSeconds(startedAt, endedAt) {
        const end = endedAt ? new Date(endedAt) : new Date();
        return Math.floor((end - new Date(startedAt)) / 1000);
    }

    function formatDate(dateStr) {
        const parts = new Intl.DateTimeFormat("en", {
            timeZone: "Europe/Paris",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(new Date(dateStr));
        const get = (part) => parts.find((p) => p.type === part).value;
        return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
    }

    function formatDuration(startedAt, endedAt) {
        const seconds = durationSeconds(startedAt, endedAt);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining = seconds % 60;
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    }

    function generateText(selected, format) {
        const exportEntries = selected.map((entry) => ({
            id: entry.id,
            description: entry.description,
            tags: entry.tags,
            started_at: formatDate(entry.started_at),
            ended_at: entry.ended_at ? formatDate(entry.ended_at) : null,
            duration_seconds: durationSeconds(entry.started_at, entry.ended_at),
        }));

        switch (format) {
            case "json":
                return JSON.stringify(exportEntries, null, 2);
            case "yaml":
                return yaml.dump(exportEntries);
            case "tsv": {
                const headers = ["id", "description", "tags", "started_at", "ended_at", "duration_seconds"];
                const rows = exportEntries.map((entry) =>
                    [
                        entry.id,
                        (entry.description || "").replace(/\t/g, " "),
                        (entry.tags || []).join(","),
                        entry.started_at,
                        entry.ended_at || "",
                        entry.duration_seconds,
                    ].join("\t"),
                );
                return [headers.join("\t"), ...rows].join("\n");
            }
            case "md-items":
                return exportEntries
                    .map((entry) => {
                        const description = entry.description || "(no description)";
                        const tags = (entry.tags || []).join(", ");
                        const duration = formatDuration(entry.started_at, entry.ended_at);
                        let line = `- **${description}** — ${entry.started_at}`;
                        line += entry.ended_at ? ` – ${entry.ended_at}` : " – running";
                        line += ` _(duration: ${duration})_`;
                        if (tags) line += ` — ${tags}`;
                        return line;
                    })
                    .join("\n");
            case "md-table": {
                const header = "| Description | Tags | Started at | Ended at | Duration (seconds) |";
                const separator = "| --- | --- | --- | --- | --- |";
                const rows = exportEntries.map((entry) => {
                    const description = (entry.description || "(no description)").replace(/\|/g, "\\|");
                    const tags = (entry.tags || []).join(", ").replace(/\|/g, "\\|");
                    return `| ${description} | ${tags} | ${entry.started_at} | ${entry.ended_at || "running"} | ${entry.duration_seconds} |`;
                });
                return [header, separator, ...rows].join("\n");
            }
        }
    }

    async function copySelected(format) {
        const selected = selectAllMatching
            ? await getMatchingTimeEntries({ view })
            : entries.filter((entry) => selectedIds.has(Number(entry.id)));
        navigator.clipboard.writeText(generateText(selected, format));
        copiedFormat = format;
        setTimeout(() => {
            copiedFormat = null;
        }, 2000);
    }
</script>

<div
    class="h-[248px]"
    aria-hidden="true"
></div>

<div
    class="fixed inset-x-0 top-0 z-50 w-full border-b border-gray-300 bg-blue-50 px-6 py-3"
    role="dialog"
    aria-modal="true"
    aria-label="Bulk edit selected time entries"
    tabindex="-1"
    onkeydown={handleKeydown}
>
    <div class="mb-3 border-b border-gray-200 pb-2">
        <strong class="text-sm">Edit description and tags for selected entries</strong>
    </div>

    <div class="space-y-3">
        <div>
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
                placeholder="Leave empty to keep existing descriptions"
                bind:value={description}
                disabled={saving}
            />
        </div>
        <div>
            <label
                for="bulk-add-tags"
                class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
            >
                Add tags
            </label>
            <InputTags
                id="bulk-add-tags"
                bind:value={addTags}
                tags={getAllTags}
                matchTags={fuzzyMatch}
                disabled={saving}
                placeholder="#tagname"
            />
        </div>
        <div>
            <label
                for="bulk-remove-tags"
                class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
            >
                Remove tags
            </label>
            <InputTags
                id="bulk-remove-tags"
                bind:value={removeTags}
                tags={getAllTags}
                matchTags={fuzzyMatch}
                disabled={saving}
                placeholder="#tagname"
            />
        </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-3">
        <button
            type="button"
            class="cursor-pointer text-[12px] text-blue-600 hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
            disabled={saving || !hasChanges}
            onclick={applyChanges}
        >
            {saving ? "Applying…" : "Apply changes"}
        </button>
        <span class="text-gray-300 select-none">|</span>
        <button
            type="button"
            class="text-[12px] text-gray-500 no-underline hover:text-blue-600 hover:underline cursor-pointer"
            onclick={cancel}
        >
            Cancel
        </button>
        {#if saveError}
            <p
                class="text-[12px] text-red-600"
                role="alert"
            >
                {saveError}
            </p>
        {/if}
        <span class="text-gray-300 select-none">|</span>
        <div class="flex flex-wrap items-center gap-1 text-[12px]">
            <span class="text-gray-500 select-none">Copy selected as</span>
            {#if copiedFormat}
                <span class="text-green-600">{formatLabels[copiedFormat]} copied!</span>
            {:else}
                {#each Object.entries(formatLabels) as [format, label], i (format)}
                    {#if i > 0}<span class="text-gray-300">|</span>{/if}
                    <button
                        type="button"
                        onclick={() => copySelected(format)}
                        class="cursor-pointer text-blue-600 no-underline hover:underline">{label}</button
                    >
                {/each}
            {/if}
        </div>
    </div>
</div>
