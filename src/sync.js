import { importTimeEntries } from "./importer.js";
import { logger } from "./logger.js";

const SYNC_WINDOW_DAYS = 14;

let stopRequested = false;
let currentTimeout = null;

export function stopSyncDaemon() {
    stopRequested = true;
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }
}

export async function startSyncDaemon(pollIntervalSeconds) {
    stopRequested = false;

    logger.info({ pollIntervalSeconds }, "Sync daemon started");

    while (!stopRequested) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - SYNC_WINDOW_DAYS * 24 * 3600_000);

        try {
            const result = await importTimeEntries({ startDate, endDate });
            logger.info(result, "Sync cycle completed");
        } catch (err) {
            logger.error({ err }, "Sync cycle failed");
        }

        if (stopRequested) break;

        await new Promise((resolve) => {
            currentTimeout = setTimeout(resolve, pollIntervalSeconds * 1000);
        });
    }

    logger.info("Sync daemon stopped");
}
