import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { literal, null_, number, object, optional, pipe, regex, safeInteger, string, union } from "valibot";

import { requireUser } from "$lib/server/require-user.js";
import { sql } from "$lib/server/pg.js";
import { getTimelineEventsPageData } from "$lib/server/timeline-events.js";
import { validateTimelineEvent } from "$lib/shared/timeline-event.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The editable fields of a timeline event, submitted as the full current state
// by the inline editor (SvelteKit checks this schema before the command handler
// runs). Empty strings are normalized to null by the handler; end_date also
// accepts "" so clearing the field survives the schema check.
const timelineEventValuesSchema = object({
    type: union([literal("milestone"), literal("period")]),
    title: string(),
    category: optional(union([null_(), string()])),
    start_date: optional(union([null_(), literal(""), pipe(string(), regex(DATE_RE))])),
    end_date: optional(union([null_(), literal(""), pipe(string(), regex(DATE_RE))])),
    description: optional(union([null_(), string()])),
});

const saveTimelineEventCommandSchema = object({
    id: pipe(number(), safeInteger()),
    values: timelineEventValuesSchema,
});

const createTimelineEventCommandSchema = object({
    values: timelineEventValuesSchema,
});

// Normalizes the create/update values submitted by the inline editor (remote
// functions): empty strings become null, the title is trimmed. Shared by the
// create and save remote handlers so both paths apply exactly the same rules.
function normalizeTimelineEventValues(values) {
    return {
        type: values.type,
        title: values.title.trim(),
        category: values.category || null,
        startDate: values.start_date || null,
        endDate: values.end_date || null,
        description: values.description || null,
    };
}

// Checks the date invariant with the shared validator so it can never drift from
// the SQL CHECK constraint. Runs BEFORE any write: an invalid payload is
// rejected with a friendly message instead of hitting a DB constraint.
function assertValid(normalized) {
    const { ok, errors } = validateTimelineEvent(normalized);
    if (!ok) throw error(400, Object.values(errors).join(" "));
}

async function insertTimelineEvent(values) {
    const [event] = await sql`
        INSERT INTO timeline_events (type, category, title, start_date, end_date, description)
        VALUES (
            ${values.type},          -- type
            ${values.category},      -- category
            ${values.title},         -- title
            ${values.startDate},     -- start_date
            ${values.endDate},       -- end_date
            ${values.description}    -- description
        )
        RETURNING id
    `;

    return event;
}

async function updateTimelineEvent(id, values) {
    const [event] = await sql`
        UPDATE timeline_events
        SET type = ${values.type},
            category = ${values.category},
            title = ${values.title},
            start_date = ${values.startDate},
            end_date = ${values.endDate},
            description = ${values.description},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id
    `;

    return event ?? null;
}

// Saves an inline edit to a timeline event: applies the full-field update, then
// re-fetches the current list so the client can refresh the table (a date change
// may reorder it) in the same request.
export const saveTimelineEvent = command(saveTimelineEventCommandSchema, async ({ id, values }) => {
    requireUser(getRequestEvent());

    const normalized = normalizeTimelineEventValues(values);
    assertValid(normalized);

    const updated = await updateTimelineEvent(id, normalized);
    if (!updated) throw error(404, "Timeline event not found.");

    const events = await getTimelineEventsPageData();

    return { events };
});

// Creates a timeline event from the inline add row, then re-fetches the current
// list so the new row appears (sorted) in the same request.
export const createTimelineEvent = command(createTimelineEventCommandSchema, async ({ values }) => {
    requireUser(getRequestEvent());

    const normalized = normalizeTimelineEventValues(values);
    assertValid(normalized);

    await insertTimelineEvent(normalized);

    const events = await getTimelineEventsPageData();

    return { events };
});
