import { Readable } from "node:stream";
import { json } from "@sveltejs/kit";
import { importCsvFromStream } from "$lib/backend/csv-importer.js";
import { logger } from "$lib/backend/logger.js";

export const trailingSlash = "always";

export async function POST({ request }) {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
        logger.warn({ contentType }, "Invalid content-type");
        return json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
        logger.warn("No file provided in multipart form");
        return json({ error: "No file provided" }, { status: 400 });
    }

    if (typeof file.name === "string" && !file.name.toLowerCase().endsWith(".csv")) {
        logger.warn({ fileName: file.name }, "File does not have .csv extension");
        return json({ error: "File must have .csv extension" }, { status: 400 });
    }

    try {
        const nodeStream = Readable.fromWeb(file.stream());
        const result = await importCsvFromStream(nodeStream);
        logger.info({ fileName: file.name, fileSize: file.size, result }, "CSV import succeeded");
        return json(result);
    } catch (err) {
        logger.error({ err, fileName: file.name }, "CSV import failed");
        return json({ error: "Import failed", detail: err.message }, { status: 500 });
    }
}
