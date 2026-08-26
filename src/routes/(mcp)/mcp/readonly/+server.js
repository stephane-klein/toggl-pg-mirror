import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { sqlReadonly } from "$lib/server/mcp/mcp-readonly-db.js";
import { validateMcpToken } from "$lib/server/auth.js";
import { logger } from "$lib/server/logger.js";
import { createMcpReadonlyServer } from "$lib/server/mcp/mcp-readonly-tools.js";

const sessions = new Map();
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 200;

function pruneSessions(now = Date.now()) {
    for (const [id, entry] of sessions) {
        if (now - entry.lastActive > SESSION_IDLE_TTL_MS) {
            sessions.delete(id);
            logger.info({ sessionId: id }, "MCP read-only session expired");
        }
    }
}

async function authorize(request) {
    const header = request.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;

    const token = await validateMcpToken(header.slice(7));

    if (!token || token.expired) return null;

    return token;
}

async function createSession(user, context) {
    let sid;
    const server = await createMcpReadonlyServer({ displayName: user.display_name, context });
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => {
            sid = crypto.randomUUID();
            return sid;
        },
        onsessioninitialized: (id) => {
            context.sessionId = id;
            sessions.set(id, { server, transport, tokenId: user.id, lastActive: Date.now() });
            logger.info({ sessionId: id }, "MCP read-only session initialized");
        },
    });
    transport.onclose = () => {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId);
            logger.info({ sessionId: transport.sessionId }, "MCP read-only session closed");
        }
    };

    await server.connect(transport);

    return { server, transport };
}

async function handleMcp(event) {
    const { request } = event;
    const user = await authorize(request);
    if (!user) {
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Unauthorized" },
                id: null,
            }),
            { status: 401, headers: { "Content-Type": "application/json" } },
        );
    }

    const sessionId = request.headers.get("mcp-session-id");

    if (sessionId) {
        const entry = sessions.get(sessionId);

        if (!entry || entry.tokenId !== user.id || Date.now() - entry.lastActive > SESSION_IDLE_TTL_MS) {
            if (entry) sessions.delete(sessionId);

            return new Response(
                JSON.stringify({
                    jsonrpc: "2.0",
                    error: { code: -32000, message: "Session not found" },
                    id: null,
                }),
                { status: 404, headers: { "Content-Type": "application/json" } },
            );
        }

        entry.lastActive = Date.now();
        return entry.transport.handleRequest(request);
    }

    const ip = event.getClientAddress();
    const context = { tokenId: user.id, userId: user.user_id, ip, sessionId: null };

    pruneSessions();
    if (sessions.size >= MAX_SESSIONS) {
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Too many sessions" },
                id: null,
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
        );
    }

    let transport;
    try {
        ({ transport } = await createSession(user, context));
    } catch (err) {
        logger.error({ err }, "Failed to create MCP read-only session");
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "MCP read-only access unavailable" },
                id: null,
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
        );
    }
    return transport.handleRequest(request);
}

export async function POST(event) {
    if (!sqlReadonly) {
        return new Response(
            JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "MCP read-only access disabled" },
                id: null,
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
        );
    }
    return handleMcp(event);
}

export async function GET(event) {
    return handleMcp(event);
}

export async function DELETE(event) {
    return handleMcp(event);
}
