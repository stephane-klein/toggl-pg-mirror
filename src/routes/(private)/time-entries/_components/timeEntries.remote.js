import { command, getRequestEvent } from "$app/server";

import {
    getTimeEntriesPageData,
    getMatchingTimeEntries as loadMatchingTimeEntries,
} from "$lib/backend/time-entries.js";
import { buildPaginationHrefs } from "$lib/backend/timeEntriesUrl.js";
import { updateTimeEntry, updateTimeEntriesBulk, undoTimeEntryOperation } from "$lib/backend/updateTimeEntry.js";
import {
    bulkEditTimeEntriesCommandSchema,
    getMatchingTimeEntriesCommandSchema,
    saveTimeEntryCommandSchema,
    undoTimeEntryEditOperationCommandSchema,
} from "$lib/schemas/timeEntry.js";

// Saves a manual edit to a time entry (single-flight): applies the partial
// update + freeze + audit, then re-fetches the current view so the client can
// refresh the table in the same request. The argument is validated by a
// Standard Schema (valibot) before the handler runs; the `view` object is
// treated loosely since it only mirrors the client's current state.
export const saveTimeEntry = command(saveTimeEntryCommandSchema, async ({ id, changes, view }) => {
    await updateTimeEntry({ id, changes });

    const data = await getTimeEntriesPageData(view);

    const { prevPageHref, nextPageHref } = buildPaginationHrefs(
        getRequestEvent().url,
        data.prevCursor,
        data.nextCursor,
        view.sort,
    );

    return {
        entries: data.entries,
        total: Number(data.total),
        prevPageHref,
        nextPageHref,
        hasFilter: !!view.q,
    };
});

export const bulkEditTimeEntries = command(
    bulkEditTimeEntriesCommandSchema,
    async ({ ids, selectAllMatching = false, changes, view }) => {
        // `selectAllMatching` resolves the target ids server-side against the
        // current view filter, so a bulk edit can span every matching entry even
        // when only one page is displayed.
        const resolvedIds = selectAllMatching
            ? (await loadMatchingTimeEntries(view)).map((entry) => Number(entry.id))
            : ids;
        const result = await updateTimeEntriesBulk({ ids: resolvedIds, changes });
        const data = await getTimeEntriesPageData(view);

        const { prevPageHref, nextPageHref } = buildPaginationHrefs(
            getRequestEvent().url,
            data.prevCursor,
            data.nextCursor,
            view.sort,
        );

        return {
            ...result,
            entries: data.entries,
            total: Number(data.total),
            prevPageHref,
            nextPageHref,
            hasFilter: !!view.q,
        };
    },
);

// Returns every entry matching the current view filter (unpaginated), used by
// the copy/export actions while the 'select all matching' selection is active.
export const getMatchingTimeEntries = command(getMatchingTimeEntriesCommandSchema, async ({ view }) => {
    return loadMatchingTimeEntries(view);
});

// Undoes the last bulk edit operation: the server restores every touched entry
// to its pre-edit snapshot (see undo_time_entry_edit_operation) and returns the
// DB result { undone }. The client then reloads the current view via
// invalidateAll().
export const undoTimeEntryEditOperation = command(undoTimeEntryEditOperationCommandSchema, async ({ operationId }) => {
    return undoTimeEntryOperation({ operationId });
});
