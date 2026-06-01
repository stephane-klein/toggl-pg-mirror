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
