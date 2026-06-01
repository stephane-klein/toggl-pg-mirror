import { l as logger, s as sql } from '../../../../chunks/pg.js-CeWEPSPu.js';
import { j as json } from '../../../../chunks/utils.js-Z9qv_ujy.js';
import { Readable } from 'node:stream';
import { parse } from 'csv-parse';
import 'postgres';
import 'pino';
import 'pino-pretty';
import '../../../../chunks/shared.js-CXWIPVHZ.js';
import '../../../../chunks/uneval.js-CGAFo80M.js';

//#region src/lib/backend/csv-importer.js
async function importCsvFromStream(readable) {
	const records = await parseFileFromReadable(readable);
	if (records.length === 0) {
		logger.warn("Empty CSV (header only, no data rows)");
		return {
			deleted: 0,
			inserted: 0
		};
	}
	const minDate = records.reduce((min, r) => r.started_at < min ? r.started_at : min, records[0].started_at);
	const maxDate = records.reduce((max, r) => r.started_at > max ? r.started_at : max, records[0].started_at);
	const deleted = await sql`
        DELETE FROM time_entries
        WHERE import_source = 'csv'
          AND started_at >= ${minDate}
          AND started_at <= ${maxDate}
    `;
	const BATCH_SIZE = 2e3;
	let inserted = 0;
	const allEntryIds = [];
	for (let i = 0; i < records.length; i += BATCH_SIZE) {
		const batch = records.slice(i, i + BATCH_SIZE);
		const ids = (await sql`
            INSERT INTO time_entries ${sql(batch, "toggl_uid", "started_at", "ended_at", "tags", "description", "import_source", "project")}
            RETURNING id
        `).map((row) => row.id);
		allEntryIds.push(...ids);
		inserted += batch.length;
	}
	await insertAuditLogs(records, allEntryIds);
	return {
		deleted: deleted.count,
		inserted,
		dateRange: {
			min: minDate.toISOString(),
			max: maxDate.toISOString()
		}
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
async function parseFileFromReadable(readable) {
	return new Promise((resolve, reject) => {
		const records = [];
		const parser = parse({
			bom: true,
			skip_empty_lines: true,
			columns: true
		});
		readable.pipe(parser).on("data", (row) => {
			const normalised = normaliseRow(row);
			if (normalised === null) {
				logger.warn({ row }, "Skipping unparseable row");
				return;
			}
			records.push(normalised);
		}).on("end", () => resolve(records)).on("error", (err) => {
			logger.error({ err }, "Malformed CSV");
			reject(/* @__PURE__ */ new Error(`Malformed CSV: ${err.message}`));
		});
	});
}
function normaliseRow(row) {
	const date = row["Start date"];
	const startTime = row["Start time"];
	const endDate = row["End date"];
	const endTime = row["End time"];
	const description = row.Description;
	if (!date || !startTime || description === void 0) return null;
	let started_at;
	try {
		started_at = /* @__PURE__ */ new Date(`${date} ${startTime}:00 UTC`);
	} catch {
		return null;
	}
	let ended_at = null;
	if (endDate && endTime) {
		const endDateStr = endDate > date ? endDate : date;
		try {
			ended_at = /* @__PURE__ */ new Date(`${endDateStr} ${endTime}:00 UTC`);
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
		project: row.Project || null
	};
}
async function insertAuditLogs(records, entryIds) {
	const BATCH_SIZE = 2e3;
	for (let i = 0; i < records.length; i += BATCH_SIZE) {
		const batchRecords = records.slice(i, i + BATCH_SIZE);
		const batchIds = entryIds.slice(i, i + BATCH_SIZE);
		await sql`
            INSERT INTO time_entry_audit_log ${sql(batchRecords.map((entry, idx) => ({
			entry_id: batchIds[idx],
			source: "csv",
			field_changed: "_created",
			new_value: {
				started_at: entry.started_at,
				ended_at: entry.ended_at,
				description: entry.description,
				project: entry.project,
				tags: entry.tags
			}
		})), "entry_id", "source", "field_changed", "new_value")}
        `;
	}
}
//#endregion
//#region src/routes/import-csv/upload/+server.js
var trailingSlash = "always";
async function POST({ request }) {
	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.includes("multipart/form-data")) {
		logger.warn({ contentType }, "Invalid content-type");
		return json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
	}
	const file = (await request.formData()).get("file");
	if (!file) {
		logger.warn("No file provided in multipart form");
		return json({ error: "No file provided" }, { status: 400 });
	}
	if (typeof file.name === "string" && !file.name.toLowerCase().endsWith(".csv")) {
		logger.warn({ fileName: file.name }, "File does not have .csv extension");
		return json({ error: "File must have .csv extension" }, { status: 400 });
	}
	try {
		const result = await importCsvFromStream(Readable.fromWeb(file.stream()));
		logger.info({
			fileName: file.name,
			fileSize: file.size,
			result
		}, "CSV import succeeded");
		return json(result);
	} catch (err) {
		logger.error({
			err,
			fileName: file.name
		}, "CSV import failed");
		return json({
			error: "Import failed",
			detail: err.message
		}, { status: 500 });
	}
}

export { POST, trailingSlash };
//# sourceMappingURL=_server.js-Bh074trW.js.map
