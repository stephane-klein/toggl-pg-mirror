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
    return response.json();
}

export async function getTimeEntries({ startDate, endDate, debug = false }) {
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

    return items.map(normaliseTimeEntry);
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
