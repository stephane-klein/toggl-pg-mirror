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

## Project Structure

### SvelteKit Routes

- `src/routes/` — page and API routes (`+page.svelte`, `+server.js`)
- `src/routes/(infra)/-/healthy/+server.js` — `/-/healthy` endpoint
- `src/routes/(infra)/-/ready/+server.js` — `/-/ready` endpoint (DB check, sync status)
- `src/hooks.server.js` — server hooks (sync daemon initialization, graceful shutdown)
- `src/app.html` — HTML shell

### Backend Modules

- `src/lib/backend/` — business logic modules (sync, importer, logger, pg client, etc.)
- `src/cli.js` — CLI entrypoint for non-server commands
- `sqls/` — database migrations and schema

### Static Assets

- `static/` — files served at root (favicon, etc.)

## Version Control

This project uses **Jujutsu** for version control.

## Database

This project uses **PostgreSQL** as its database, accessed directly with raw SQL — **no ORM**.

SQL queries are executed using the [`postgres`](https://github.com/porsager/postgres) library (package name: `postgres`).

Migrations are managed by [`postgres-shift`](https://github.com/porsager/postgres-shift) and located in `sqls/migrations/`.

The complete schema (consolidated) is written by hand in `sqls/schema.sql`.

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

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Backlog

Global overview of all issues at `.scratch/BACKLOG.md` — status, dependencies, and next actionable items. See `.scratch/BACKLOG.md`.

### Domain docs

Multi-context layout — `CONTEXT-MAP.md` at root pointing to per-context `CONTEXT.md` files. See `docs/agents/domain.md`.

## Supplementary Documentation

- [`docs/agents/`](docs/agents/) — operational snapshots of subsystems (loaded on demand by the agent)
- [`docs/decisions/`](docs/decisions/) — architecture decision records
- `.opencode/skills/new-decision/` — skill for creating new decision records
