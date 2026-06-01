# Agent Instructions

## Project Context

A Node.js service that mirrors Toggl time-tracking data into a self-controlled PostgreSQL database, keeping it in sync to serve as a source of truth. Enables querying and enriching historical data — e.g., via LLMs — for weekly, monthly, or per-activity time reports.

## Language Policy

- **All project content must be in English**: source code, comments, commit messages, and documentation.
- **Human conversations in OpenCode remain in French**.

## Package Manager Policy

- Always use `pnpm` for installing, adding, and removing packages.
- Never use `npm` or `yarn`.

## Code Quality

This project uses [Biome](https://biomejs.dev) for linting and formatting:
- `pnpm lint` — check for code issues
- `pnpm format` — auto-format code
- `pnpm check` — run both (format + lint + organize imports)

Configuration: `biome.jsonc`

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
- Avoid intermediate variables without semantic value (*expression-oriented*):
  prefer `getMonths().map(...)` to `const months = getMonths(); months.map(...)`.
  Prefer `(await Promise.all(...)).forEach(...)` to `const results = []; for (...)`.
  If a step is complex, prefer a comment over a superfluous variable.
- Avoid mutations: no `.push()` in a loop if `.map()` suffices (*immutability*).

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


