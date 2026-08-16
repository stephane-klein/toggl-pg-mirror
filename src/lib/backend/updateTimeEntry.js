import { error } from "@sveltejs/kit";
import { fromZonedTime } from "date-fns-tz";

import { sql } from "./pg.js";

const TIMEZONE = "Europe/Paris";
const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

function parseDateTime(raw) {
    if (typeof raw !== "string" || !DATETIME_RE.test(raw)) {
        error(400, `Invalid datetime: ${JSON.stringify(raw)} — expected "YYYY-MM-DD HH:MM[:SS]"`);
    }
    const date = fromZonedTime(raw.replace(" ", "T"), TIMEZONE);
    if (Number.isNaN(date.getTime())) {
        error(400, `Invalid datetime: ${raw}`);
    }
    return date;
}

function normalizeTags(raw) {
    if (!Array.isArray(raw)) {
        error(400, "tags must be an array of strings");
    }
    return raw.map((tag) => String(tag).trim()).filter(Boolean);
}

// Applies a manual edit to a time entry: partial update of only the supplied
// fields, freeze against Toggl sync (manually_edited_at), and one audit log row
// (source 'manual') per changed field. The write + diff + audit happen in a
// single upsert_time_entries call; the diff is computed in SQL (IS DISTINCT
// FROM). Date values arrive as "YYYY-MM-DD HH:MM" Europe/Paris text from the
// inline editor; an empty string or null clears a field.
export async function updateTimeEntry({ id, changes }) {
    const [current] = await sql`
        SELECT id, toggl_uid, started_at, ended_at, tags, description, project, import_source
        FROM time_entries
        WHERE id = ${id}
    `;
    if (!current) {
        error(404, `Time entry ${id} not found`);
    }

    const fields = {};
    if (changes.description !== undefined) {
        fields.description = changes.description === "" ? null : String(changes.description);
    }
    if (changes.tags !== undefined) {
        fields.tags = normalizeTags(changes.tags);
    }
    if (changes.started_at !== undefined) {
        fields.started_at = parseDateTime(changes.started_at);
    }
    if (changes.ended_at !== undefined) {
        fields.ended_at = changes.ended_at === "" || changes.ended_at === null ? null : parseDateTime(changes.ended_at);
    }

    const newStartedAt = fields.started_at ?? current.started_at;
    const newEndedAt = fields.ended_at !== undefined ? fields.ended_at : current.ended_at;
    if (newEndedAt !== null && newEndedAt < newStartedAt) {
        error(400, "ended_at must be after started_at");
    }

    if (Object.keys(fields).length === 0) return;

    await sql.unsafe(
        `SELECT upsert_time_entries(
            _entries => $1::jsonb,
            _source => $2::text,
            _import_source => $3::varchar(10)
        )`,
        [
            [
                {
                    id: Number(current.id),
                    toggl_uid: current.toggl_uid === null ? null : Number(current.toggl_uid),
                    started_at: fields.started_at ?? current.started_at,
                    ended_at: fields.ended_at !== undefined ? fields.ended_at : current.ended_at,
                    tags: fields.tags ?? current.tags,
                    description: fields.description !== undefined ? fields.description : current.description,
                    project: current.project,
                    // NOW() here guarantees the i.updated_at > e.updated_at stale guard passes.
                    updated_at: new Date(),
                },
            ],
            "manual",
            current.import_source,
        ],
        { prepare: false },
    );
}
