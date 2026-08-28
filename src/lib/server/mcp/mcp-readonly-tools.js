import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getTimeEntriesSchema, recordMcpAccess, sqlReadonly } from "./mcp-readonly-db.js";
import { logger } from "$lib/server/logger.js";

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
                    "  - Tags are normalized: time_entry_tags holds one row per distinct tag (name, exact case) and\n" +
                    "    time_entry_tag_entries one row per (entry_id, tag_id) with a position column. Join time_entries to\n" +
                    "    time_entry_tag_entries on entry_id, then to time_entry_tags on tag_id, to search per tag;\n" +
                    "    match case-insensitively with lower(name).\n" +
                    "Timezone conversion:\n" +
                    "  - started_at and ended_at are TIMESTAMPTZ columns stored in UTC.\n" +
                    "  - Use the AT TIME ZONE operator to convert them to a timezone:\n" +
                    "      started_at AT TIME ZONE 'Europe/Paris'\n" +
                    "  - Unless the user asks for another timezone, convert to the Paris timezone (Europe/Paris) by default.\n" +
                    "Example:\n" +
                    "  SELECT started_at AT TIME ZONE 'Europe/Paris' AS started_at_paris,\n" +
                    "         ended_at AT TIME ZONE 'Europe/Paris' AS ended_at_paris\n" +
                    "  FROM time_entries\n" +
                    "  WHERE deleted_at IS NULL\n" +
                    "  LIMIT 5;\n" +
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
            {
                name: "searchTags",
                description:
                    `Search the distinct tags of user '${displayName}' used within a date range, with an ` +
                    "optional fuzzy (trigram) substring filter, and per-tag usage statistics.\n" +
                    "Semantics:\n" +
                    "  - The date range is half-open [from, to): a tag counts an entry when started_at is in [from, to).\n" +
                    "  - Soft-deleted entries are excluded.\n" +
                    "  - Only tags actually used in the period are returned.\n" +
                    "  - entry_count is the number of matching entries; duration_hours is the summed duration of those\n" +
                    "    entries (running entries use now() as end).\n" +
                    "  - 'q' is an optional substring filter on the tag name, matched accent- and case-insensitively\n" +
                    "    (trigram-backed); omit it or pass '' to match all tags.\n" +
                    "  - 'sort' is optional, defaulting to name_asc; values: name_asc, name_desc, count_asc, count_desc,\n" +
                    "    duration_asc, duration_desc.",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: {
                            type: "string",
                            description: "Start of the range (inclusive), YYYY-MM-DD",
                        },
                        to: {
                            type: "string",
                            description: "End of the range (exclusive), YYYY-MM-DD",
                        },
                        q: {
                            type: "string",
                            description: "Optional accent- and case-insensitive substring filter on the tag name",
                        },
                        sort: {
                            type: "string",
                            description: "Optional sort; default name_asc",
                            enum: ["name_asc", "name_desc", "count_asc", "count_desc", "duration_asc", "duration_desc"],
                        },
                        purpose: {
                            type: "string",
                            description: "Describe the purpose of this search in under 400 characters.",
                            maxLength: 400,
                        },
                    },
                    required: ["from", "to", "purpose"],
                },
            },
        ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        logger.debug({ toolName: name }, "MCP tool call");

        if (name !== "readOnlySqlQuery" && name !== "searchTags") {
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

        const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        const VALID_SORTS = ["name_asc", "name_desc", "count_asc", "count_desc", "duration_asc", "duration_desc"];

        let query;
        if (name === "searchTags") {
            const from = args.from;
            const to = args.to;
            const _q = typeof args.q === "string" ? args.q : "";
            const _sort = VALID_SORTS.includes(args.sort) ? args.sort : "name_asc";

            if (typeof from !== "string" || !DATE_RE.test(from) || typeof to !== "string" || !DATE_RE.test(to)) {
                return {
                    content: [
                        { type: "text", text: "The 'from' and 'to' fields are required and must be YYYY-MM-DD." },
                    ],
                    isError: true,
                };
            }

            query = {
                text:
                    `SELECT * FROM list_tags(\n` +
                    `    _from => $1::date,\n` +
                    `    _to => $2::date,\n` +
                    `    _sort => $3,\n` +
                    `    _q => $4\n` +
                    `)`,
                values: [from, to, _sort, _q],
                label: `searchTags(from=${from}, to=${to}, q=${_q}, sort=${_sort})`,
            };
        } else {
            query = {
                text: args.query,
                values: [],
                label: args.query,
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
                return await tx.unsafe(query.text, query.values);
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
                query: query.label,
                purpose: args.purpose,
                success,
            });
        }

        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });

    return server;
}
