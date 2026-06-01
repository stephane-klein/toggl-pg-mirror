import { logger } from "./logger.js";

const TOGGL_API_TOKEN = process.env.TOGGL_PG_MIRROR_TOGGL_API_TOKEN;

if (!TOGGL_API_TOKEN) {
    throw new Error("TOGGL_PG_MIRROR_TOGGL_API_TOKEN environment variable is required");
}

function buildAuthHeader(token) {
    const credentials = Buffer.from(`${token}:api_token`).toString("base64");
    return `Basic ${credentials}`;
}

export async function ping() {
    const authHeader = buildAuthHeader(TOGGL_API_TOKEN);
    const url = "https://api.track.toggl.com/api/v9/me";
    const t0 = performance.now();

    let response;
    try {
        response = await fetch(url, {
            headers: {
                Authorization: authHeader,
            },
        });
    } catch (err) {
        const duration = Math.round(performance.now() - t0);
        logger.error({ err, url, duration }, "Toggl API request failed");
        throw err;
    }

    const duration = Math.round(performance.now() - t0);

    if (!response.ok) {
        const statusCode = response.status;
        logger.error({ statusCode, url, duration }, "Toggl API returned error");
        const error = new Error(`Toggl API error: ${statusCode}`);
        error.statusCode = statusCode;
        error.url = url;
        throw error;
    }

    logger.debug({ method: "GET", url, status: response.status, duration });

    const data = await response.json();

    const quotaRemaining = response.headers.get("X-Toggl-Quota-Remaining");
    const quotaResetsIn = response.headers.get("X-Toggl-Quota-Resets-In");

    return { user: data, quotaRemaining, quotaResetsIn };
}

async function fetchPage({ startDate, endDate, debug }) {
    const authHeader = buildAuthHeader(TOGGL_API_TOKEN);
    const url = new URL("https://api.track.toggl.com/api/v9/me/time_entries");
    url.searchParams.set("start_date", startDate.toISOString());
    url.searchParams.set("end_date", endDate.toISOString());

    logger.debug({ method: "GET", url: url.toString() }, "Fetching time entries from Toggl");

    let response;
    try {
        response = await fetch(url.toString(), {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });
    } catch (err) {
        logger.error({ err }, "Toggl API request failed");
        throw err;
    }

    if (!response.ok) {
        const statusCode = response.status;
        logger.error({ statusCode }, "Toggl API returned error");
        const error = new Error(`Toggl API error: ${statusCode}`);
        error.statusCode = statusCode;
        throw error;
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : (data.items ?? data.data ?? []);

    if (debug) {
        console.log(`Toggl API raw response:\n${JSON.stringify(data, null, 2)}`);
    }

    logger.info({ count: items.length, startDate, endDate }, "Fetched time entries from Toggl");

    const quotaRemaining = response.headers.get("X-Toggl-Quota-Remaining");
    const quotaResetsIn = response.headers.get("X-Toggl-Quota-Resets-In");

    return { items, quotaRemaining, quotaResetsIn };
}

export async function getTimeEntries({ startDate, endDate, debug = false }) {
    const allItems = [];
    let currentEnd = endDate;
    let page = 0;
    const MAX_PAGES = 100;
    let quotaRemaining = null;
    let quotaResetsIn = null;

    while (page < MAX_PAGES) {
        page++;

        const result = await fetchPage({ startDate, endDate: currentEnd, debug });
        if (result.items.length === 0) break;

        allItems.push(...result.items);

        quotaRemaining = result.quotaRemaining;
        quotaResetsIn = result.quotaResetsIn;

        if (result.items.length < 1000) break;

        const oldestStart = new Date(result.items[result.items.length - 1].start);
        currentEnd = new Date(oldestStart.getTime() - 1000);

        logger.info(
            { page, count: result.items.length, nextEndDate: currentEnd },
            "More entries available, fetching next page",
        );
    }

    const seen = new Set();
    const deduped = [];
    for (const item of allItems) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        deduped.push(item);
    }

    logger.info({ total: deduped.length, pages: page }, "Fetched all time entries");

    return { entries: deduped.map(normaliseTimeEntry), quotaRemaining, quotaResetsIn };
}

function normaliseTimeEntry(entry) {
    return {
        toggl_uid: BigInt(entry.id),
        started_at: new Date(entry.start),
        ended_at: entry.stop ? new Date(entry.stop) : null,
        tags: entry.tags ?? [],
        description: entry.description ?? null,
        project: entry.project_name ?? null,
    };
}
