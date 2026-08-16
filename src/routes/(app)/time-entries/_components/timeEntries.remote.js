import { command, getRequestEvent } from "$app/server";

import { getTimeEntriesPageData } from "$lib/backend/time-entries.js";
import { buildPaginationHrefs } from "$lib/backend/timeEntriesUrl.js";
import { updateTimeEntry, updateTimeEntriesBulk, undoTimeEntryOperation } from "$lib/backend/updateTimeEntry.js";

// Saves a manual edit to a time entry (single-flight): applies the partial
// update + freeze + audit, then re-fetches the current view so the client can
// refresh the table in the same request. 'unchecked' skips schema validation
// (Standard Schema would be a new dependency); the argument is validated
// manually in updateTimeEntry.
export const saveTimeEntry = command("unchecked", async ({ id, changes, view }) => {
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

export const bulkEditTimeEntries = command("unchecked", async ({ ids, changes, view }) => {
    const result = await updateTimeEntriesBulk({ ids, changes });
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
});

// Undoes the last bulk edit operation: the server restores every touched entry
// to its pre-edit snapshot (see undo_time_entry_edit_operation) and returns the
// DB result { undone }. The client then reloads the current view via
// invalidateAll().
export const undoTimeEntryEditOperation = command("unchecked", async ({ operationId }) => {
    return undoTimeEntryOperation({ operationId });
});
