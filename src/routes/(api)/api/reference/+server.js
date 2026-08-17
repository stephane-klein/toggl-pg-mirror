import { ScalarApiReference } from "@scalar/sveltekit";

const render = ScalarApiReference({
    url: "/api/v1/openapi.json",
    agent: {
        disabled: true,
    },
    mcp: {
        disabled: true,
    },
    hideClientButton: true,
    documentDownloadType: "none",
    showDeveloperTools: "never",
    customCss: `a[href*="scalar.com"] { display: none !important; }`,
});

export async function GET() {
    const response = render();
    const html = await response.text();

    const modified = html
        .replace(
            "</style>",
            [
                `.app-header {`,
                `    border-bottom: 1px solid var(--scalar-border-color, #ddd);`,
                `    padding: 9px 20px;`,
                `    font-family: "Inter", system-ui, sans-serif;`,
                `}`,
                `.app-header a {`,
                `    color: var(--scalar-color-1, #1a1a1a);`,
                `    text-decoration: none;`,
                `    font-weight: 700;`,
                `    font-size: 15px;`,
                `}`,
                `.app-footer {`,
                `    border-top: 1px solid var(--scalar-border-color, #ddd);`,
                `    padding: 11px 20px;`,
                `    font-size: 12px;`,
                `    color: var(--scalar-color-2, #666);`,
                `    font-family: "Inter", system-ui, sans-serif;`,
                `}`,
                `.app-footer a {`,
                `    color: var(--scalar-color-2, #666);`,
                `    text-decoration: none;`,
                `}`,
                `.app-footer a:hover {`,
                `    text-decoration: underline;`,
                `}`,
                `.sidebar-footer a[href*="scalar.com"] { display: none !important; }`,
                `</style>`,
            ].join("\n"),
        )
        .replace(
            '<div id="app">',
            `<header class="app-header"><a href="/">toggl-pg-mirror</a></header>\n<div id="app">`,
        )
        .replace("</body>", `<footer class="app-footer">\n    <a href="/">Back to home</a>\n</footer>\n</body>`);

    return new Response(modified, {
        headers: { "content-type": "text/html" },
    });
}
