import { n as logger, t as sql } from "./pg.js";
//#region src/lib/backend/toggl-client.js
var TOGGL_API_TOKEN = process.env.TOGGL_PG_MIRROR_TOGGL_API_TOKEN;
var togglIsConfigured = !!TOGGL_API_TOKEN;
if (!TOGGL_API_TOKEN) logger.warn("TOGGL_PG_MIRROR_TOGGL_API_TOKEN not set — Toggl API features disabled");
function buildAuthHeader(token) {
	return `Basic ${Buffer.from(`${token}:api_token`).toString("base64")}`;
}
async function fetchPage({ startDate, endDate, debug }) {
	const authHeader = buildAuthHeader(TOGGL_API_TOKEN);
	const url = new URL("https://api.track.toggl.com/api/v9/me/time_entries");
	url.searchParams.set("start_date", startDate.toISOString());
	url.searchParams.set("end_date", endDate.toISOString());
	logger.debug({
		method: "GET",
		url: url.toString()
	}, "Fetching time entries from Toggl");
	let response;
	try {
		response = await fetch(url.toString(), { headers: {
			Authorization: authHeader,
			"Content-Type": "application/json"
		} });
	} catch (err) {
		logger.error({ err }, "Toggl API request failed");
		throw err;
	}
	if (!response.ok) {
		const statusCode = response.status;
		logger.error({ statusCode }, "Toggl API returned error");
		const error = /* @__PURE__ */ new Error(`Toggl API error: ${statusCode}`);
		error.statusCode = statusCode;
		throw error;
	}
	const data = await response.json();
	const items = Array.isArray(data) ? data : data.items ?? data.data ?? [];
	if (debug) console.log(`Toggl API raw response:\n${JSON.stringify(data, null, 2)}`);
	logger.info({
		count: items.length,
		startDate,
		endDate
	}, "Fetched time entries from Toggl");
	return {
		items,
		quotaRemaining: response.headers.get("X-Toggl-Quota-Remaining"),
		quotaResetsIn: response.headers.get("X-Toggl-Quota-Resets-In")
	};
}
async function getTimeEntries({ startDate, endDate, debug = false }) {
	if (!togglIsConfigured) {
		logger.warn("Toggl API getTimeEntries skipped — no API token configured");
		return {
			entries: [],
			quotaRemaining: null,
			quotaResetsIn: null
		};
	}
	const allItems = [];
	let currentEnd = endDate;
	let page = 0;
	const MAX_PAGES = 100;
	let quotaRemaining = null;
	let quotaResetsIn = null;
	while (page < MAX_PAGES) {
		page++;
		const result = await fetchPage({
			startDate,
			endDate: currentEnd,
			debug
		});
		if (result.items.length === 0) break;
		allItems.push(...result.items);
		quotaRemaining = result.quotaRemaining;
		quotaResetsIn = result.quotaResetsIn;
		if (result.items.length < 1e3) break;
		const oldestStart = new Date(result.items[result.items.length - 1].start);
		currentEnd = /* @__PURE__ */ new Date(oldestStart.getTime() - 1e3);
		logger.info({
			page,
			count: result.items.length,
			nextEndDate: currentEnd
		}, "More entries available, fetching next page");
	}
	const seen = /* @__PURE__ */ new Set();
	const deduped = [];
	for (const item of allItems) {
		if (seen.has(item.id)) continue;
		seen.add(item.id);
		deduped.push(item);
	}
	logger.info({
		total: deduped.length,
		pages: page
	}, "Fetched all time entries");
	return {
		entries: deduped.map(normaliseTimeEntry),
		quotaRemaining,
		quotaResetsIn
	};
}
function normaliseTimeEntry(entry) {
	return {
		toggl_uid: BigInt(entry.id),
		started_at: new Date(entry.start),
		ended_at: entry.stop ? new Date(entry.stop) : null,
		tags: entry.tags ?? [],
		description: entry.description ?? null,
		project: entry.project_name ?? null,
		updated_at: new Date(entry.at)
	};
}
//#endregion
//#region src/lib/backend/importer.js
var IMPORT_SOURCE = "api_sync";
async function importTimeEntries({ startDate, endDate, debug = false }) {
	if (!togglIsConfigured) {
		logger.warn("Toggl import skipped — no API token configured");
		return {
			deletedCsv: 0,
			deleted: 0,
			inserted: 0,
			updated: 0,
			unchanged: 0,
			quotaRemaining: null,
			quotaResetsIn: null
		};
	}
	const deletedCsv = (await sql`
        DELETE FROM time_entries
        WHERE import_source = 'csv'
          AND started_at >= ${startDate}
          AND started_at <= ${endDate}
    `).count;
	const dbEntries = await sql`
        SELECT id, toggl_uid, started_at, ended_at, tags, description, project, updated_at
        FROM time_entries
        WHERE import_source = 'api_sync'
          AND deleted_at IS NULL
          AND started_at >= ${startDate}
          AND started_at <= ${endDate}
    `;
	const { entries: apiEntries, quotaRemaining, quotaResetsIn } = await getTimeEntries({
		startDate,
		endDate,
		debug
	});
	const dbByUid = new Map(dbEntries.map((e) => [String(e.toggl_uid), e]));
	const apiByUid = new Map(apiEntries.map((e) => [String(e.toggl_uid), e]));
	const toDelete = dbEntries.filter((e) => !apiByUid.has(String(e.toggl_uid)));
	const toInsert = apiEntries.filter((e) => !dbByUid.has(String(e.toggl_uid)));
	const toUpdate = [];
	for (const [uid, apiEntry] of apiByUid) {
		const dbEntry = dbByUid.get(uid);
		if (dbEntry && apiEntry.updated_at > dbEntry.updated_at) {
			const changes = detectChanges(dbEntry, apiEntry);
			if (changes.length > 0) toUpdate.push({
				dbEntry,
				apiEntry,
				changes
			});
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
					started_at: auditValue(entry.started_at),
					ended_at: auditValue(entry.ended_at),
					description: entry.description,
					project: entry.project,
					tags: entry.tags
				},
				new_value: null
			})}
            `;
			deleted++;
		}
		if (toInsert.length > 0) {
			const result = await tx`
                INSERT INTO time_entries ${sql(toInsert.map((e) => ({
				toggl_uid: e.toggl_uid,
				started_at: e.started_at,
				ended_at: e.ended_at,
				tags: e.tags,
				description: e.description,
				import_source: IMPORT_SOURCE,
				project: e.project
			})), "toggl_uid", "started_at", "ended_at", "tags", "description", "import_source", "project")}
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
				if (row === void 0) continue;
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
						tags: entry.tags
					}
				})}
                `;
			}
			inserted = toInsert.length;
		}
		for (const { dbEntry, apiEntry, changes } of toUpdate) {
			const updateData = {};
			for (const field of changes) updateData[field] = apiEntry[field];
			updateData.updated_at = /* @__PURE__ */ new Date();
			await tx`
                UPDATE time_entries
                SET ${sql(updateData, ...changes, "updated_at")}
                WHERE id = ${dbEntry.id}
            `;
			for (const field of changes) await tx`
                    INSERT INTO time_entry_audit_log ${sql({
				entry_id: dbEntry.id,
				source: "toggl",
				field_changed: field,
				old_value: auditValue(dbEntry[field]),
				new_value: auditValue(apiEntry[field])
			})}
                `;
			updated++;
		}
	});
	const result = {
		deletedCsv,
		deleted,
		inserted,
		updated,
		unchanged,
		quotaRemaining,
		quotaResetsIn
	};
	logger.info(result, "Import completed");
	return result;
}
function detectChanges(existing, incoming) {
	const fields = [
		"started_at",
		"ended_at",
		"tags",
		"description",
		"project"
	];
	const changes = [];
	for (const field of fields) if (!isEqual(existing[field], incoming[field])) changes.push(field);
	return changes;
}
function auditValue(value) {
	if (value instanceof Date) return value.toISOString();
	return value ?? null;
}
function isEqual(a, b) {
	if (a === b) return true;
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
		return true;
	}
	return false;
}
//#endregion
//#region src/lib/backend/sync.js
var SYNC_WINDOW_DAYS = 14;
var stopRequested = false;
var currentTimeout = null;
var syncDaemonStarted = false;
function isSyncDaemonRunning() {
	return syncDaemonStarted;
}
function stopSyncDaemon() {
	stopRequested = true;
	if (currentTimeout) {
		clearTimeout(currentTimeout);
		currentTimeout = null;
	}
}
async function startSyncDaemon(pollIntervalSeconds) {
	if (!togglIsConfigured) {
		logger.warn("Sync daemon not started — no Toggl API token configured");
		return;
	}
	stopRequested = false;
	logger.info({ pollIntervalSeconds }, "Sync daemon started");
	syncDaemonStarted = true;
	while (!stopRequested) {
		const endDate = /* @__PURE__ */ new Date();
		const startDate = /* @__PURE__ */ new Date(endDate.getTime() - SYNC_WINDOW_DAYS * 24 * 36e5);
		try {
			const result = await importTimeEntries({
				startDate,
				endDate
			});
			logger.info(result, "Sync cycle completed");
		} catch (err) {
			logger.error({ err }, "Sync cycle failed");
		}
		if (stopRequested) break;
		await new Promise((resolve) => {
			currentTimeout = setTimeout(resolve, pollIntervalSeconds * 1e3);
		});
	}
	logger.info("Sync daemon stopped");
	syncDaemonStarted = false;
}
//#endregion
export { togglIsConfigured as i, startSyncDaemon as n, stopSyncDaemon as r, isSyncDaemonRunning as t };
