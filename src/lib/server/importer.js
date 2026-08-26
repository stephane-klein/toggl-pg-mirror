import { logger } from "./logger.js";
import { sql } from "./pg.js";
import { getTimeEntries, togglIsConfigured } from "./toggl-client.js";

const IMPORT_SOURCE = "api_sync";

export async function importTimeEntries({ startDate, endDate, debug = false }) {
    if (!togglIsConfigured) {
        logger.warn("Toggl import skipped — no API token configured");
        return {
            deletedCsv: 0,
            deleted: 0,
            inserted: 0,
            updated: 0,
            unchanged: 0,
            quotaRemaining: null,
            quotaResetsIn: null,
        };
    }

    const deletedCsvResult = await sql`
        DELETE FROM time_entries
        WHERE import_source = 'csv'
          AND started_at >= ${startDate}
          AND started_at <= ${endDate}
    `;
    const deletedCsv = deletedCsvResult.count;

    // CSV rows are hard-deleted (CASCADE removes their join rows); purge any
    // dimension name left unreferenced.
    await sql`
        DELETE FROM time_entry_tags t
        WHERE NOT EXISTS (SELECT 1 FROM time_entry_tag_entries j WHERE j.tag_id = t.id)
    `;

    const dbEntries = await sql`
        SELECT te.id, te.toggl_uid, te.started_at, te.ended_at,
               COALESCE(tg.tags, '{}'::text[]) AS tags,
               te.description, te.project, te.updated_at, te.manually_edited_at
        FROM time_entries te
        LEFT JOIN LATERAL (
            SELECT array_agg(tgt.name ORDER BY jt.position) AS tags
            FROM time_entry_tag_entries jt
            JOIN time_entry_tags tgt ON tgt.id = jt.tag_id
            WHERE jt.entry_id = te.id
        ) tg ON TRUE
        WHERE te.import_source = 'api_sync'
          AND te.deleted_at IS NULL
          AND te.started_at >= ${startDate}
          AND te.started_at <= ${endDate}
    `;

    const { entries: apiEntries, quotaRemaining, quotaResetsIn } = await getTimeEntries({ startDate, endDate, debug });

    const dbByUid = new Map(dbEntries.map((e) => [String(e.toggl_uid), e]));
    const apiByUid = new Map(apiEntries.map((e) => [String(e.toggl_uid), e]));

    const toDelete = dbEntries.filter((e) => !apiByUid.has(String(e.toggl_uid)));
    const toInsert = apiEntries.filter((e) => !dbByUid.has(String(e.toggl_uid)));

    const toUpdate = [];
    for (const [uid, apiEntry] of apiByUid) {
        const dbEntry = dbByUid.get(uid);
        // Frozen entries (manually edited locally) are skipped: the sync must not
        // overwrite manual edits. Thawing is a future manual action.
        if (dbEntry && !dbEntry.manually_edited_at && apiEntry.updated_at > dbEntry.updated_at) {
            const changes = detectChanges(dbEntry, apiEntry);
            if (changes.length > 0) {
                toUpdate.push({ dbEntry, apiEntry, changes });
            }
        }
    }

    let deleted = 0;
    let inserted = 0;
    let updated = 0;
    const unchanged = dbEntries.length - toUpdate.length - toDelete.length;

    await sql.begin(async (tx) => {
        for (const entry of toDelete) {
            await tx`UPDATE time_entries SET deleted_at = NOW() WHERE id = ${entry.id}`;
            await tx`DELETE FROM time_entry_tag_entries WHERE entry_id = ${entry.id}`;
            await tx`
                DELETE FROM time_entry_tags t
                WHERE NOT EXISTS (SELECT 1 FROM time_entry_tag_entries j WHERE j.tag_id = t.id)
            `;
            await tx`
                INSERT INTO time_entry_audit_log ${sql({
                    entry_id: entry.id,
                    source: "toggl",
                    field_changed: "_deleted",
                    old_value: {
                        started_at: auditValue(entry.started_at),
                        ended_at: auditValue(entry.ended_at),
                        description: entry.description,
                        project: entry.project,
                        tags: entry.tags,
                    },
                    new_value: null,
                })}
            `;
            deleted++;
        }

        if (toInsert.length > 0) {
            const rows = toInsert.map((e) => ({
                toggl_uid: e.toggl_uid,
                started_at: e.started_at,
                ended_at: e.ended_at,
                description: e.description,
                import_source: IMPORT_SOURCE,
                project: e.project,
            }));

            const result = await tx`
                INSERT INTO time_entries ${sql(rows, "toggl_uid", "started_at", "ended_at", "description", "import_source", "project")}
                ON CONFLICT (toggl_uid) DO UPDATE SET
                    started_at = EXCLUDED.started_at,
                    ended_at = EXCLUDED.ended_at,
                    description = EXCLUDED.description,
                    project = EXCLUDED.project,
                    import_source = EXCLUDED.import_source,
                    updated_at = NOW(),
                    deleted_at = NULL
                RETURNING id, toggl_uid
            `;

            const resultMap = new Map(result.map((r) => [String(r.toggl_uid), r]));

            for (const entry of toInsert) {
                const row = resultMap.get(String(entry.toggl_uid));
                if (row === undefined) {
                    continue;
                }
                await tx`
                    INSERT INTO time_entry_audit_log ${sql({
                        entry_id: row.id,
                        source: "toggl",
                        field_changed: "_created",
                        old_value: null,
                        new_value: {
                            started_at: auditValue(entry.started_at),
                            ended_at: auditValue(entry.ended_at),
                            description: entry.description,
                            project: entry.project,
                            tags: entry.tags,
                        },
                    })}
                `;
                await tx.unsafe(`SELECT set_time_entry_tags($1::bigint, $2::text[])`, [row.id, entry.tags ?? []], {
                    prepare: false,
                });
            }
            inserted = toInsert.length;
        }

        for (const { dbEntry, apiEntry, changes } of toUpdate) {
            const setFields = changes.filter((field) => field !== "tags");
            const updateData = {};
            for (const field of setFields) {
                updateData[field] = apiEntry[field];
            }
            updateData.updated_at = new Date();

            await tx`
                UPDATE time_entries
                SET ${sql(updateData, ...setFields, "updated_at")}
                WHERE id = ${dbEntry.id}
            `;

            if (changes.includes("tags")) {
                await tx.unsafe(
                    `SELECT set_time_entry_tags($1::bigint, $2::text[])`,
                    [dbEntry.id, apiEntry.tags ?? []],
                    { prepare: false },
                );
            }

            for (const field of changes) {
                await tx`
                    INSERT INTO time_entry_audit_log ${sql({
                        entry_id: dbEntry.id,
                        source: "toggl",
                        field_changed: field,
                        old_value: auditValue(dbEntry[field]),
                        new_value: auditValue(apiEntry[field]),
                    })}
                `;
            }
            updated++;
        }
    });

    const result = { deletedCsv, deleted, inserted, updated, unchanged, quotaRemaining, quotaResetsIn };
    logger.info(result, "Import completed");

    return result;
}

function detectChanges(existing, incoming) {
    const fields = ["started_at", "ended_at", "tags", "description", "project"];
    const changes = [];

    for (const field of fields) {
        if (!isEqual(existing[field], incoming[field])) {
            changes.push(field);
        }
    }

    return changes;
}

function auditValue(value) {
    if (value instanceof Date) return value.toISOString();
    return value ?? null;
}

function isEqual(a, b) {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    return false;
}
