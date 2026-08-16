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
