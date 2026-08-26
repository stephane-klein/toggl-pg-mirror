export function parseSelectedIds(raw) {
    if (!raw) return [];

    return [
        ...new Set(
            raw
                .split(",")
                .map(Number)
                .filter((id) => Number.isSafeInteger(id) && id > 0),
        ),
    ];
}

export function selectedIdsForEntries(raw, entries) {
    const availableIds = new Set(entries.map((entry) => Number(entry.id)));
    return parseSelectedIds(raw).filter((id) => availableIds.has(id));
}

// Parses the `selected` query param into the selection state for a view.
// `selected=all` is the sentinel for "every entry matching the current filter"
// (select-all-across-pages): the ids are resolved server-side at action time.
// Any other value keeps the page-scoped explicit selection (as before).
export function parseSelectionState(raw, entries) {
    if (raw === "all") return { selectedIds: [], selectAllMatching: true };
    return { selectedIds: selectedIdsForEntries(raw, entries), selectAllMatching: false };
}
