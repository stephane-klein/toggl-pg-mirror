import { writable } from "svelte/store";

// Transient "undo the last bulk edit" state, module-scoped so it survives the
// client-side navigation that clears the selection after an apply. The server
// keeps the undoable operation in the DB, so this store is only a UI hint.
// expiresAt is the deadline the countdown counts down to: it lives in the store
// (not the component) so switching views never resets the timer.
export const UNDO_WINDOW_MS = 120_000;

/** @type {import('svelte/store').Writable<{ operationId: number, count: number, expiresAt: number } | null>} */
export const pendingUndo = writable(null);
