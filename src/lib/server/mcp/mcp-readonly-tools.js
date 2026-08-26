import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getTimeEntriesSchema, recordMcpAccess, sqlReadonly } from "./mcp-readonly-db.js";
import { logger } from "$lib/backend/logger.js";

export async function createMcpReadonlyServer({ displayName, context }) {
    const schema = await getTimeEntriesSchema();

    const server = new Server(
        { name: "toggl-pg-mirror-mcp-readonly", version: "1.0.0" },
        { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: "readOnlySqlQuery",
                description:
                    `Read-only access to the time-tracking data (the time_entries table) of user '${displayName}', ` +
                    "to answer questions about how they spend their time — past activity, " +
                    "weekly/monthly workload, time per project or tag, and so on.\n" +
                    `Available table:\n- ${schema}\n` +
                    "Semantics and tips:\n" +
                    "  - An entry is 'running' when ended_at IS NULL.\n" +
                    "  - Exclude soft-deleted entries: WHERE deleted_at IS NULL.\n" +
                    "  - Duration = ended_at - started_at; aggregate by day/week, project or tag to summarize how time is spent.\n" +
                    "  - tags is a TEXT[] array — use unnest(tags) to search per tag.\n" +
                    "Only SELECT, EXPLAIN, and WITH (read-only CTE) queries are allowed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The read-only SQL query to execute",
                        },
                        purpose: {
                            type: "string",
                            description: "Describe the purpose of this query in under 400 characters.",
                            maxLength: 400,
                        },
                    },
                    required: ["query", "purpose"],
                },
            },
        ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        logger.debug({ toolName: name }, "MCP tool call");

        if (name !== "readOnlySqlQuery") {
            return {
                content: [{ type: "text", text: `Unknown tool: ${name}` }],
                isError: true,
            };
        }

        const clientInfo = server.getClientVersion?.() ?? {};

        if (typeof args.purpose !== "string" || args.purpose.length > 400) {
            return {
                content: [
                    {
                        type: "text",
                        text: "The 'purpose' field is required and must be ≤ 400 characters.",
                    },
                ],
                isError: true,
            };
        }

        let result;
        let success = true;
        try {
            // Run each query in a read-only transaction scoped to one pooled
            // connection, so the hardening settings apply even when the app role
            // could not ALTER ROLE (e.g. a role provisioned by CNPG managed.roles).
            result = await sqlReadonly.begin(async (tx) => {
                await tx`SET TRANSACTION READ ONLY`;
                await tx`SET LOCAL statement_timeout = '10s'`;
                await tx`SET LOCAL idle_in_transaction_session_timeout = '10s'`;
                return await tx.unsafe(args.query);
            });
        } catch (err) {
            success = false;
            throw err;
        } finally {
            recordMcpAccess({
                tokenId: context.tokenId,
                userId: context.userId,
                sessionId: context.sessionId,
                clientName: clientInfo.name,
                clientVersion: clientInfo.version,
                ip: context.ip,
                query: args.query,
                purpose: args.purpose,
                success,
            });
        }

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });

    return server;
}
