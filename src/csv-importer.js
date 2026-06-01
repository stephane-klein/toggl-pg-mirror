import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { parse } from "csv-parse";
import { logger } from "./logger.js";
import { sql } from "./pg.js";

export async function importCsv(filePath) {
    let fileStat;
    try {
        fileStat = await stat(filePath);
    } catch {
        logger.error({ filePath }, "File not found");
        throw new Error(`File not found: ${filePath}`);
    }

    const records = await parseFile(filePath, fileStat.size);

    if (records.length === 0) {
        logger.warn("Empty CSV (header only, no data rows)");
        return { deleted: 0, inserted: 0 };
    }

    const minDate = records.reduce((min, r) => (r.started_at < min ? r.started_at : min), records[0].started_at);
    const maxDate = records.reduce((max, r) => (r.started_at > max ? r.started_at : max), records[0].started_at);

    const deleted = await sql`
        DELETE FROM time_entries
        WHERE import_source = 'csv'
          AND started_at >= ${minDate}
          AND started_at <= ${maxDate}
    `;

    const BATCH_SIZE = 2000;
    let inserted = 0;
    const allEntryIds = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const result = await sql`
            INSERT INTO time_entries ${sql(batch, "toggl_uid", "started_at", "ended_at", "tags", "description", "import_source", "project")}
            RETURNING id
        `;
        const ids = result.map((row) => row.id);
        allEntryIds.push(...ids);
        inserted += batch.length;
    }

    await insertAuditLogs(records, allEntryIds);

    return {
        deleted: deleted.count,
        inserted,
        dateRange: { min: minDate.toISOString(), max: maxDate.toISOString() },
    };
}

/**
 * Example return value:
 * [
 *   {
 *     toggl_uid: null,
 *     started_at: new Date("2024-01-15 09:00:00 UTC"),
 *     ended_at: new Date("2024-01-15 10:30:00 UTC"),
 *     tags: ["meeting"],
 *     description: "Sprint planning",
 *     import_source: "csv",
 *     project: "Engineering",
 *   },
 *   {
 *     toggl_uid: null,
 *     started_at: new Date("2024-01-15 13:00:00 UTC"),
 *     ended_at: null,
 *     tags: [],
 *     description: "Code review",
 *     import_source: "csv",
 *     project: null,
 *   },
 * ]
 */
async function parseFile(filePath, _fileSize) {
    return new Promise((resolve, reject) => {
        const records = [];
        const parser = parse({
            bom: true,
            skip_empty_lines: true,
            columns: true,
        });

        createReadStream(filePath, { highWaterMark: 1024 * 1024 })
            .pipe(parser)
            .on("data", (row) => {
                const normalised = normaliseRow(row);
                if (normalised === null) {
                    logger.warn({ row }, "Skipping unparseable row");
                    return;
                }
                records.push(normalised);
            })
            .on("end", () => resolve(records))
            .on("error", (err) => {
                logger.error({ err }, "Malformed CSV");
                reject(new Error(`Malformed CSV: ${err.message}`));
            });
    });
}

function normaliseRow(row) {
    const date = row["Start date"];
    const startTime = row["Start time"];
    const endDate = row["End date"];
    const endTime = row["End time"];
    const description = row.Description;

    if (!date || !startTime || description === undefined) {
        return null;
    }

    let started_at;
    try {
        started_at = new Date(`${date} ${startTime}:00 UTC`);
    } catch {
        return null;
    }

    let ended_at = null;
    if (endDate && endTime) {
        const endDateStr = endDate > date ? endDate : date;
        try {
            ended_at = new Date(`${endDateStr} ${endTime}:00 UTC`);
        } catch {
            ended_at = null;
        }
    }

    const tagsRaw = row.Tags || "";
    const tags = tagsRaw === "" ? [] : tagsRaw.split(", ").map((t) => t.trim());

    return {
        toggl_uid: null,
        started_at,
        ended_at,
        tags,
        description,
        import_source: "csv",
        project: row.Project || null,
    };
}

async function insertAuditLogs(records, entryIds) {
    const BATCH_SIZE = 2000;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batchRecords = records.slice(i, i + BATCH_SIZE);
        const batchIds = entryIds.slice(i, i + BATCH_SIZE);

        const auditRows = batchRecords.map((entry, idx) => ({
            entry_id: batchIds[idx],
            source: "csv",
            field_changed: "_created",
            new_value: {
                started_at: entry.started_at,
                ended_at: entry.ended_at,
                description: entry.description,
                project: entry.project,
                tags: entry.tags,
            },
        }));

        await sql`
            INSERT INTO time_entry_audit_log ${sql(auditRows, "entry_id", "source", "field_changed", "new_value")}
        `;
    }
}
