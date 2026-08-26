import { Readable } from "node:stream";
import { json } from "@sveltejs/kit";
import { importCsvFromStream } from "$lib/server/csv-importer.js";
import { logger } from "$lib/server/logger.js";
import { problem } from "../../_problem.js";

const ADMIN_TOKEN = process.env.TOGGL_PG_MIRROR_ADMIN_TOKEN;

function authorizeImport(event) {
    if (event.locals.user) return null;

    const auth = event.request.headers.get("Authorization");
    if (ADMIN_TOKEN && ADMIN_TOKEN.length >= 32 && auth === `Bearer ${ADMIN_TOKEN}`) {
        return null;
    }

    return problem(401, "Authentication required", event.request.url);
}

export async function POST(event) {
    const authError = authorizeImport(event);
    if (authError) return authError;

    const request = event.request;
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
        logger.warn({ contentType }, "Invalid content-type");
        return problem(400, "Content-Type must be multipart/form-data", request.url);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
        logger.warn("No file provided in multipart form");
        return problem(400, "No file provided", request.url);
    }

    if (typeof file.name === "string" && !file.name.toLowerCase().endsWith(".csv")) {
        logger.warn({ fileName: file.name }, "File does not have .csv extension");
        return problem(400, "File must have .csv extension", request.url);
    }

    try {
        const nodeStream = Readable.fromWeb(file.stream());
        const result = await importCsvFromStream(nodeStream);
        logger.info({ fileName: file.name, fileSize: file.size, result }, "CSV import succeeded");
        return json({
            data: result,
            _links: { self: { href: "/api/v1/time-entries/import-csv" } },
        });
    } catch (err) {
        logger.error({ err, fileName: file.name }, "CSV import failed");
        return problem(500, `Import failed: ${err.message}`, request.url);
    }
}
