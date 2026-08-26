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

function normalizeBulkTags(raw, field) {
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) error(400, `${field} must be an array of strings`);

    return [...new Set(raw.map((tag) => String(tag).trim()).filter(Boolean))];
}

// Applies a manual edit to a time entry: partial update of only the supplied
// fields, freeze against Toggl sync (manually_edited_at), and one audit log row
// (source 'manual') per changed field. The write + diff + audit happen in a
// single upsert_time_entries call; the diff is computed in SQL (IS DISTINCT
// FROM). Date values arrive as "YYYY-MM-DD HH:MM" Europe/Paris text from the
// inline editor; an empty string or null clears a field.
export async function updateTimeEntry({ id, changes }) {
    const [current] = await sql`
        SELECT te.id, te.toggl_uid, te.started_at, te.ended_at,
               COALESCE(tg.tags, '{}'::text[]) AS tags,
               te.description, te.project, te.import_source
        FROM time_entries te
        LEFT JOIN LATERAL (
            SELECT array_agg(tgt.name ORDER BY jt.position) AS tags
            FROM time_entry_tag_entries jt
            JOIN time_entry_tags tgt ON tgt.id = jt.tag_id
            WHERE jt.entry_id = te.id
        ) tg ON TRUE
        WHERE te.id = ${id}
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

export async function updateTimeEntriesBulk({ ids, changes }) {
    if (!Array.isArray(ids) || ids.length === 0) error(400, "ids must be a non-empty array");

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        error(400, "ids must contain positive integers");
    }

    const description = changes?.description;
    if (description !== undefined && typeof description !== "string") {
        error(400, "description must be a string");
    }

    const addTags = normalizeBulkTags(changes?.addTags, "addTags");
    const removeTags = normalizeBulkTags(changes?.removeTags, "removeTags");
    const conflictingTags = addTags.filter((tag) => removeTags.includes(tag));
    if (conflictingTags.length > 0) {
        error(400, `A tag cannot be added and removed at the same time: ${conflictingTags.join(", ")}`);
    }

    return sql.begin(async (tx) => {
        const currentEntries = await tx`
            SELECT te.id, te.toggl_uid, te.started_at, te.ended_at,
                   COALESCE(tg.tags, '{}'::text[]) AS tags,
                   te.description, te.project, te.import_source, te.updated_at
            FROM time_entries te
            LEFT JOIN LATERAL (
                SELECT array_agg(tgt.name ORDER BY jt.position) AS tags
                FROM time_entry_tag_entries jt
                JOIN time_entry_tags tgt ON tgt.id = jt.tag_id
                WHERE jt.entry_id = te.id
            ) tg ON TRUE
            WHERE te.id = ANY(${tx.array(uniqueIds, 20)})
            FOR UPDATE
        `;

        if (currentEntries.length !== uniqueIds.length) {
            const foundIds = new Set(currentEntries.map((entry) => Number(entry.id)));
            const missingId = uniqueIds.find((id) => !foundIds.has(id));
            error(404, `Time entry ${missingId} not found`);
        }

        const entries = currentEntries.map((entry) => {
            const currentTags = entry.tags || [];
            const nextTags = [
                ...currentTags.filter((tag) => !removeTags.includes(tag)),
                ...addTags.filter((tag) => !currentTags.includes(tag)),
            ];
            const nextDescription = description === undefined || description === "" ? entry.description : description;

            return {
                id: Number(entry.id),
                toggl_uid: entry.toggl_uid === null ? null : Number(entry.toggl_uid),
                started_at: entry.started_at,
                ended_at: entry.ended_at,
                tags: nextTags,
                description: nextDescription,
                project: entry.project,
                updated_at: new Date(),
                import_source: entry.import_source,
            };
        });

        const changedEntries = entries.filter((entry, index) => {
            const current = currentEntries[index];
            return (
                entry.description !== current.description || JSON.stringify(entry.tags) !== JSON.stringify(current.tags)
            );
        });

        if (changedEntries.length === 0) return { updatedCount: 0, operationId: null };

        await tx.unsafe(
            `SELECT upsert_time_entries(
                _entries => $1::jsonb,
                _source => $2::text,
                _import_source => $3::varchar(10)
            )`,
            [changedEntries, "manual", "api_sync"],
            { prepare: false },
        );

        // Record the undoable operation in the same transaction: full
        // before/after snapshot per touched entry. Dates are serialized as ISO
        // strings so the stored function can round-trip them as timestamptz.
        const currentById = new Map(currentEntries.map((entry) => [Number(entry.id), entry]));
        const snapshot = (entry) => ({
            started_at: entry.started_at.toISOString(),
            ended_at: entry.ended_at ? entry.ended_at.toISOString() : null,
            tags: entry.tags || [],
            description: entry.description,
            project: entry.project,
        });
        const snapshots = changedEntries.map((entry) => ({
            entry_id: entry.id,
            before: snapshot(currentById.get(entry.id)),
            after: snapshot(entry),
        }));

        const [opRow] = await tx.unsafe(
            `SELECT record_time_entry_edit_operation($1::text, $2::jsonb) AS op_id`,
            ["bulk_edit", snapshots],
            { prepare: false },
        );

        return { updatedCount: changedEntries.length, operationId: Number(opRow.op_id) };
    });
}

// Undoes a recorded edit operation: restores every touched entry to its
// before_snapshot via undo_time_entry_edit_operation (which re-applies through
// upsert_time_entries with source 'manual', so new audit rows are written and
// the entries are re-frozen against the Toggl sync).
export async function undoTimeEntryOperation({ operationId }) {
    let row;
    try {
        [row] = await sql.unsafe(`SELECT undo_time_entry_edit_operation($1::bigint) AS result`, [operationId], {
            prepare: false,
        });
    } catch (err) {
        const message = err?.message || String(err);
        if (message.includes("not found")) error(404, message);
        error(409, message);
    }
    return row.result;
}
