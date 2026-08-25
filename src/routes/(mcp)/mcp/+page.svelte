<script>
    let { data } = $props();
    const mcpTokensPath = "/my/mcp-tokens";
    const opencodeConfig = $derived(`{
  "mcp": {
    "toggl-pg-mirror-readonly": {
      "type": "remote",
      "url": "${data.origin}/mcp/readonly",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer YOUR_MCP_TOKEN"
      }
    }
  }
}`);
</script>

<svelte:head>
    <title>MCP read-only server — toggl-pg-mirror</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline hover:underline">toggl-pg-mirror</a
        >
        <nav class="text-sm text-gray-500">
            <a
                href="/login"
                class="text-gray-500 no-underline hover:text-blue-600 hover:underline">Sign in</a
            >
        </nav>
    </div>
</header>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">MCP read-only server</h1>

    <p class="mb-2">
        The service exposes a
        <a
            class="text-blue-600 hover:underline"
            href="https://modelcontextprotocol.io">Model Context Protocol</a
        >
        (MCP) server that lets an AI agent read the
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">time_entries</code> table over raw SQL. It is available at
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">{data.origin}/mcp/readonly</code>.
    </p>

    <p class="mb-2">Access is read-only by design, enforced at two levels:</p>
    <ul class="list-disc pl-6 mb-2">
        <li>
            <strong>Database role</strong> — queries run as a dedicated PostgreSQL role (<code
                class="bg-gray-100 px-1 py-0.5 rounded-sm">toggl_mcp_reader</code
            >) with
            <code class="bg-gray-100 px-1 py-0.5 rounded-sm">SELECT</code>-only privileges on
            <code class="bg-gray-100 px-1 py-0.5 rounded-sm">time_entries</code>.
        </li>
        <li>
            <strong>HTTP authentication</strong> — every request must carry
            <code class="bg-gray-100 px-1 py-0.5 rounded-sm">Authorization: Bearer &lt;your-mcp-token&gt;</code>. Create
            a token at
            <a
                href={mcpTokensPath}
                class="text-blue-600 hover:underline">MCP tokens</a
            >. If the token is invalid or expired, the request is rejected.
        </li>
    </ul>

    <h2 class="text-lg font-bold mb-3 mt-6">Tool</h2>
    <table class="mb-4 text-sm">
        <thead>
            <tr class="text-left border-b border-gray-300">
                <th class="pr-4 py-1">Tool</th>
                <th class="py-1">Description</th>
            </tr>
        </thead>
        <tbody>
            <tr class="border-b border-gray-200">
                <td class="pr-4 py-1 font-mono">readOnlySqlQuery</td>
                <td class="py-1">
                    Execute a read-only SQL query (<code class="bg-gray-100 px-1 py-0.5 rounded-sm">SELECT</code>/
                    <code class="bg-gray-100 px-1 py-0.5 rounded-sm">EXPLAIN</code>/
                    <code class="bg-gray-100 px-1 py-0.5 rounded-sm">WITH</code>) against the
                    <code class="bg-gray-100 px-1 py-0.5 rounded-sm">time_entries</code> table.
                </td>
            </tr>
        </tbody>
    </table>

    <p class="mb-2">Available table:</p>
    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono mb-4">
time_entries(
  id            BIGINT,
  toggl_uid     BIGINT,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  tags          TEXT[],
  description   TEXT,
  import_source VARCHAR(10),
  project       TEXT,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  manually_edited_at TIMESTAMPTZ
)</pre>

    <h2 class="text-lg font-bold mb-3 mt-6">Usage</h2>
    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono mb-4">
$ curl -s -X POST {data.origin}/mcp/readonly \
    -H "Authorization: Bearer YOUR_MCP_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '&#123;"jsonrpc":"2.0","id":1,"method":"tools/list"&#125;'</pre>

    <h2 class="text-lg font-bold mb-3 mt-6">OpenCode</h2>
    <p class="mb-2">Add to your project's <code class="bg-gray-100 px-1 py-0.5 rounded-sm">opencode.jsonc</code>:</p>
    <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono mb-4">{opencodeConfig}</pre>

    <h2 class="text-lg font-bold mb-3 mt-6">Claude Desktop</h2>
    <p class="mb-2">
        In Claude Desktop, go to
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">Settings → Connectors → Add custom connector</code>
        and enter the URL
        <code class="bg-gray-100 px-1 py-0.5 rounded-sm">{data.origin}/mcp/readonly</code>.
    </p>

    <p class="mt-5 pt-4 border-t border-gray-300 text-sm text-gray-500">
        <a
            href="/"
            class="text-blue-600 hover:underline">Back to home</a
        >
    </p>
</main>
