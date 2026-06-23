import http from "node:http";
import { logger } from "./logger.js";
import { sql } from "./pg.js";

const PORT = parseInt(process.env.TOGGL_PG_MIRROR_HEALTH_PORT || "8080", 10);

let server = null;

export function startHealthServer() {
    server = http.createServer(async (req, res) => {
        res.setHeader("Content-Type", "application/json");

        if (req.url === "/health") {
            res.writeHead(200);
            res.end(JSON.stringify({ status: "ok" }));
            return;
        }

        if (req.url === "/ready") {
            try {
                await sql`SELECT 1`;
                res.writeHead(200);
                res.end(JSON.stringify({ status: "ok", ready: true }));
            } catch {
                res.writeHead(503);
                res.end(JSON.stringify({ status: "error", ready: false }));
            }
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: "not found" }));
    });

    server.listen(PORT);
    logger.info({ port: PORT }, "Healthcheck server started");
    return server;
}

export function stopHealthServer() {
    if (server) {
        server.close();
        server = null;
    }
}
