import { logger } from "./logger.js";
import { sql } from "./pg.js";
import { getTimeEntries } from "./toggl-client.js";

const IMPORT_SOURCE = "api_sync";

export async function importTimeEntries({ startDate, endDate, debug = false }) {
    const deletedCsvResult = await sql`
        DELETE FROM time_entries
        WHERE import_source = 'csv'
          AND started_at >= ${startDate}
          AND started_at <= ${endDate}
    `;
    const deletedCsv = deletedCsvResult.count;

    const dbEntries = await sql`
        SELECT id, toggl_uid, started_at, ended_at, tags, description, project
        FROM time_entries
        WHERE import_source = 'api_sync'
          AND deleted_at IS NULL
          AND started_at >= ${startDate}
          AND started_at <= ${endDate}
    `;

    const apiEntries = await getTimeEntries({ startDate, endDate, debug });

    const dbByUid = new Map(dbEntries.map((e) => [String(e.toggl_uid), e]));
    const apiByUid = new Map(apiEntries.map((e) => [String(e.toggl_uid), e]));

    const toDelete = dbEntries.filter((e) => !apiByUid.has(String(e.toggl_uid)));
    const toInsert = apiEntries.filter((e) => !dbByUid.has(String(e.toggl_uid)));

    const toUpdate = [];
    for (const [uid, apiEntry] of apiByUid) {
        const dbEntry = dbByUid.get(uid);
        if (dbEntry) {
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
            await tx`
                INSERT INTO time_entry_audit_log ${sql({
                    entry_id: entry.id,
                    source: "toggl",
                    field_changed: "_deleted",
                    old_value: {
                        started_at: entry.started_at,
                        ended_at: entry.ended_at,
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
                tags: e.tags,
                description: e.description,
                import_source: IMPORT_SOURCE,
                project: e.project,
            }));

            const result = await tx`
                INSERT INTO time_entries ${sql(rows, "toggl_uid", "started_at", "ended_at", "tags", "description", "import_source", "project")}
                ON CONFLICT (toggl_uid) DO UPDATE SET
                    started_at = EXCLUDED.started_at,
                    ended_at = EXCLUDED.ended_at,
                    tags = EXCLUDED.tags,
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
                            started_at: entry.started_at,
                            ended_at: entry.ended_at,
                            description: entry.description,
                            project: entry.project,
                            tags: entry.tags,
                        },
                    })}
                `;
            }
            inserted = toInsert.length;
        }

        for (const { dbEntry, apiEntry, changes } of toUpdate) {
            const updateData = {};
            for (const field of changes) {
                updateData[field] = apiEntry[field];
            }
            updateData.updated_at = new Date();

            await tx`
                UPDATE time_entries
                SET ${sql(updateData, ...changes, "updated_at")}
                WHERE id = ${dbEntry.id}
            `;

            for (const field of changes) {
                await tx`
                    INSERT INTO time_entry_audit_log ${sql({
                        entry_id: dbEntry.id,
                        source: "toggl",
                        field_changed: field,
                        old_value: dbEntry[field] ?? null,
                        new_value: apiEntry[field] ?? null,
                    })}
                `;
            }
            updated++;
        }
    });

    const result = { deletedCsv, deleted, inserted, updated, unchanged };
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
