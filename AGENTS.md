# Agent Instructions

## Project Context

A Node.js service that mirrors Toggl time-tracking data into a self-controlled PostgreSQL database, keeping it in sync to serve as a source of truth. The service runs as a SvelteKit SSR application (adapter-node) that handles both HTTP endpoints and the background sync daemon.

## Language Policy

- **All project content must be in English**: source code, comments, commit messages, and documentation.
- **Human conversations in OpenCode remain in French**.

## Package Manager Policy

- Always use `pnpm` for installing, adding, and removing packages.
- Never use `npm` or `yarn`.

## Code Quality

This project uses **ESLint** with `eslint-plugin-svelte` for linting and
**Prettier** with `prettier-plugin-svelte` for formatting:

- `pnpm lint` — check for code issues
- `pnpm format` — auto-format code
- `pnpm check` — run both (format check + lint)

Configuration: `eslint.config.js`, `prettier.config.js`

## SvelteKit SSR

This project uses SvelteKit with `@sveltejs/adapter-node` for SSR.

Build commands:

- `pnpm dev` — start development server with hot reload
- `pnpm build` — production build (outputs to `build/`)
- `pnpm preview` — preview the production build locally

The built server is started with `node build/index.js` (PORT env var, default 3000).

### Component colocation

When a Svelte component is used only by a single page or a subtree of
routes, colocate it under `src/routes/.../_components/` instead of
`src/lib/components/`. The `_` prefix tells SvelteKit to ignore the
directory for routing.

Components shared across multiple unrelated route groups stay in
`src/lib/components/`.

### Remote functions and authentication

Remote functions (`command()`, `query()`, `form()` exported from `*.remote.js`
files, e.g. `src/routes/.../_components/*.remote.js`) are exposed as independent
HTTP endpoints. They are **NOT** protected by `+layout.server.js` guards —
SvelteKit only runs those `load()` guards for pages, not for remote-function
calls. The `authHandle` hook still populates `event.locals.user`, so each remote
function must check it explicitly via `getRequestEvent().locals.user` (prefer a
shared `requireUser(event)` helper from `src/lib/server/require-user.js`) and
throw `error(401, ...)` otherwise. Never rely on the `(private)` route group or
a layout guard to protect a remote function.

The MCP endpoint at `/mcp/readonly` is likewise not protected by any layout
guard. It enforces its own `Authorization: Bearer <mcp-token>` check (a per-user
MCP token created at `/my/mcp-tokens/`, validated via `validateMcpToken`) directly in
`src/routes/(mcp)/mcp/readonly/+server.js`, and runs queries
through the read-only PostgreSQL role (see `src/lib/server/mcp/mcp-readonly-db.js`).

### Server-only library code

Library code that runs only on the server (DB access via `postgres`, auth,
sync daemon, mailer, file/`node:` APIs, `process.env`, secrets, etc.) MUST live
under `src/lib/server/` and be imported via `$lib/server/...`. SvelteKit enforces
this at build time: the `vite-plugin-sveltekit-guard` throws `Cannot import
$lib/server/... into code that runs in the browser` if a client entrypoint
(a Svelte component, a universal `load`, a client/universal hook) imports one.
This is a security guarantee — never place server-only code anywhere else.

Pure / isomorphic modules (no Node, DB, or environment access) that are needed
from BOTH the server and client Svelte components live under `src/lib/shared/`
and are imported via `$lib/shared/...`. If a module has to be importable by a
client component, it must be pure (no `node:` imports, no DB, no `process.env`)
and belong in `src/lib/shared/`.

`src/lib/backend/` is **forbidden**: it no longer exists, never create it and
never import from it. When adding a new module, decide its home up front:
server-only → `src/lib/server/`, isomorphic/pure → `src/lib/shared/`.

## Project Structure

### SvelteKit Routes

- `src/routes/` — page and API routes (`+page.svelte`, `+server.js`)
- `src/routes/(public)/` — pages reachable without authentication (`/login`, `/reset-password`, `/change-password`, `/magic-link/sent`, `/magic-login/callback`)
- `src/routes/(private)/` — authenticated pages (time-entries, import-csv, my/profile, my/password, my/tokens); guarded by `+layout.server.js`
- `src/routes/(api)/` — HTTP API endpoints (`/api/v1/admin/users`, `/api/v1/admin/send-test-mail`, `/api/v1/openapi.json`, `/api/reference`)
- `src/routes/(infra)/-/healthy/+server.js` — `/-/healthy` endpoint
- `src/routes/(infra)/-/ready/+server.js` — `/-/ready` endpoint (DB check, sync status)
- `src/routes/(infra)/-/version.json/+server.js` — `/-/version.json` endpoint
- `src/routes/(mcp)/mcp/readonly/+server.js` — read-only MCP server at `/mcp/readonly` (JSON-RPC over Streamable HTTP)
- `src/hooks.server.js` — server hooks (auth, sync daemon initialization, graceful shutdown)
- `src/app.html` — HTML shell

### Library modules

- `src/lib/server/` — server-only business logic modules (sync, importer, logger, pg client, auth, mailer, etc.). Imported via `$lib/server/...`.
- `src/lib/shared/` — pure / isomorphic modules usable from both client and server (chart utils, tag filter, URL helpers, etc.). Imported via `$lib/shared/...`.
- `src/lib/backend/` — **forbidden**. This directory no longer exists; never create it and never import from it.
- `src/cli.js` — CLI entrypoint for non-server commands
- `sqls/` — database migrations and schema

### Static Assets

- `static/` — files served at root (favicon, etc.)

## Version Control

This project uses **Jujutsu** for version control.

## Database

This project uses **PostgreSQL** as its database, accessed directly with raw SQL — **no ORM**.

SQL queries are executed using the [`postgres`](https://github.com/porsager/postgres) library (package name: `postgres`).

Persisted SQL functions live in a single file `sqls/functions.sql` (DROP + CREATE,
idempotent), loaded automatically at the end of every migration run by `src/migrate.js`.
Functions may depend on anything migrations create (tables, indexes, `immutable_unaccent`)
but never the reverse: migrations run before `functions.sql` and must not call its functions.
Every page render that needs several values from the database must be served by a
single stored SQL function (CTE + JSON) — one round-trip per render.
See `docs/decisions/2026-07_002-single-sql-function-per-page-render.md`.

When calling a stored SQL function from a `postgres` query, prefer PostgreSQL's
named-argument notation so each placeholder is labeled with its parameter name:

```sql
SELECT get_time_entries_page_data(
    _from => $1::date,
    _to => $2::date,
    ...
)
```

All arguments must use the named form — PostgreSQL rejects positional arguments
that follow the first named one.

Stored functions that rely on parameter-dependent plans (e.g. the direction-guarded
`UNION ALL` branches in `get_time_entries_page_data`) must be called with
`{ prepare: false }`: an unnamed statement is always custom-planned, so the real
parameter values are folded at plan time. See ADR 002.

Migrations are managed by [`postgres-shift`](https://github.com/porsager/postgres-shift) and located in `sqls/migrations/`.

The complete schema (consolidated) is written by hand in `sqls/schema.sql`.

### Function execution privileges (default-deny)

Functions are PUBLIC-executable by default in PostgreSQL. `sqls/functions.sql`
ends with a `DO` block that revokes `EXECUTE ON ALL FUNCTIONS IN SCHEMA ... FROM
PUBLIC` and sets `ALTER DEFAULT PRIVILEGES`, so only the owning app role can call
functions by default. Any other role that needs a function gets an explicit,
per-function `GRANT EXECUTE`. The MCP reader role's grants live in
`ensureMcpReaderRole` (`src/lib/server/mcp/mcp-reader-role.js`): `SELECT` on
`time_entries` plus `EXECUTE` on the fuzzy-search helpers `immutable_unaccent`,
`immutable_lower`. Never rely on PUBLIC EXECUTE for a new
function; add an explicit grant instead.

## Node.js Paradigms

### Code style

- Inline simple logic: prefer inline expressions over extracting helper functions for trivial operations (e.g., single `await sql` calls).
- Extract functions only when code reuse, readability, or testability genuinely benefits.

### Functional style

- Prefer chaining `.map()`, `.filter()`, `.reduce()`, `.forEach()` over imperative loops.
- Avoid intermediate variables without semantic value (_expression-oriented_):
  prefer `getMonths().map(...)` to `const months = getMonths(); months.map(...)`.
  Prefer `(await Promise.all(...)).forEach(...)` to `const results = []; for (...)`.
  If a step is complex, prefer a comment over a superfluous variable.
- Avoid mutations: no `.push()` in a loop if `.map()` suffices (_immutability_).

### To avoid

- Tacit programming / point-free style: always explicitly name function arguments.
  Prefer `[1,2,3].map(n => add1(n))` to `[1,2,3].map(add1)`.

## OpenAPI Spec Sync

The OpenAPI specification is dynamically generated in
`src/routes/(api)/api/v1/openapi.json/+server.js`.

**Any change to request/response schemas in route handlers must be reflected
here too.** The Scalar API reference UI at `/api/reference` consumes this spec.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Backlog

Global overview of all issues at `.scratch/BACKLOG.md` — status, dependencies, and next actionable items. See `.scratch/BACKLOG.md`.

## Supplementary Documentation

- [`docs/agents/`](docs/agents/) — operational snapshots of subsystems (loaded on demand by the agent)
- [`docs/decisions/`](docs/decisions/) — architecture decision records
- `.opencode/skills/new-decision/` — skill for creating new decision records

## Local AGENTS.md

When working inside a subdirectory that contains an `AGENTS.md`, read it for
subsystem-specific instructions. Currently available:

- `src/routes/(app)/time-entries/AGENTS.md` — URL conventions for time-entries UI
