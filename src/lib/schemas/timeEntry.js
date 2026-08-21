import {
    array,
    boolean,
    looseObject,
    literal,
    null_,
    number,
    object,
    optional,
    pipe,
    regex,
    safeInteger,
    string,
    union,
} from "valibot";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

// The `changes` payload of a manual single-entry edit. `view` is an internal
// client state object and is only loosely validated: the meaningful user input
// lives in `id` and `changes`, which SvelteKit checks against this schema before
// the command handler runs (replacing the previous `command("unchecked", ...)`).
export const timeEntryChangesSchema = object({
    description: optional(string()),
    tags: optional(array(string())),
    started_at: optional(pipe(string(), regex(DATETIME_RE))),
    // An empty string or null clears the field.
    ended_at: optional(union([null_(), literal(""), pipe(string(), regex(DATETIME_RE))])),
});

export const saveTimeEntryCommandSchema = object({
    id: pipe(number(), safeInteger()),
    changes: timeEntryChangesSchema,
    view: looseObject({}),
});

export const bulkEditChangesSchema = object({
    description: optional(string()),
    addTags: optional(array(string())),
    removeTags: optional(array(string())),
});

export const bulkEditTimeEntriesCommandSchema = object({
    ids: array(pipe(number(), safeInteger())),
    selectAllMatching: optional(boolean()),
    changes: bulkEditChangesSchema,
    view: looseObject({}),
});

export const getMatchingTimeEntriesCommandSchema = object({
    view: looseObject({}),
});

export const undoTimeEntryEditOperationCommandSchema = object({
    operationId: pipe(number(), safeInteger()),
});
