# toggl-pg-mirror

This project implements the idea described in [Projet 36 — "toggl-pg-mirror: Agréger mon historique de temps dans PostgreSQL"](https://notes.sklein.xyz/Projet%2036/zen/).

A Node.js service that mirrors Toggl time-tracking data into a self-controlled PostgreSQL database, keeping it in sync to serve as a source of truth. Enables querying and enriching historical data — e.g., via LLMs — for weekly, monthly, or per-activity time reports.

- **SSR/CSR tech info popup** — performance popup (bottom-right, `tech info` button) showing total time, server processing, PostgreSQL queries, network roundtrip, hydration/rendering, page weight, client startup, and version info (build timestamp, GitHub commit link) for both SSR (first full page load) and CSR (client navigation). Uses `Server-Timing` header + Performance API — no extra requests.

## Tech Stack

- Runtime: Node.js 24 (ESM)
- Package manager: pnpm
- Database: PostgreSQL 18
- PostgreSQL extensions: pg_trgm, unaccent (trigram fuzzy search, accent-insensitive)
- SQL client: [postgres](https://github.com/porsager/postgres)
- Migrations: [postgres-shift](https://github.com/porsager/postgres-shift)
- HTTP server: SvelteKit 2 with adapter-node (SSR)
- Build tool: Vite
- Search field: [svelte-codemirror-search-field](https://github.com/stephane-klein/svelte-codemirror-search-field) — CodeMirror 6-based field with tag autocomplete
- Autocomplete select: [svelecte](https://github.com/mskocik/svelecte) — tag picker with free entry (creatable) in the profile activity matrix editor
- Chart axes: [d3-scale](https://github.com/d3/d3-scale) — scale utilities (linear, band) for the sleep activity chart
- Drag & drop: [svelte-dnd-action](https://github.com/isaacHagoel/svelte-dnd-action) — pointer-based row reordering with live visual feedback in the profile activity matrix editor
- SvelteKit [remote functions](https://svelte.dev/docs/kit/remote-functions) (`$app/server`) — experimental RPC for tag autocomplete
- Containers: Podman Compose
- Email testing: [Mailpit](https://github.com/axllent/mailpit) (dev SMTP server with web UI)
- Tooling: mise
- **Authentication** — sessions, API tokens, password reset, magic link login (following [Lucia](https://lucia-auth.com/sessions/overview) security recommendations)
- **API documentation** — interactive reference at `/api/reference` powered by [Scalar](https://scalar.com/)
- **OpenAPI spec** — auto-generated and served at `/api/v1/openapi.json`

## AI-Assisted Development

This project was developed using:

- [OpenCode](https://opencode.ai) CLI — coding assistant workflow (not vibe coding)
- Models: DeepSeek v4 Flash (OpenCode Go)

## Principles

- Monorepository and monolithic application pattern ([notes](https://notes.sklein.xyz/2025-05-06_2224/zen/))
- Raw SQL — no ORM
- Trying to embrace [Radical Simplicity](https://www.radicalsimpli.city/): reducing accidental complexity, applying LEAN techniques
- Vigilance against [cargo cult](https://en.wikipedia.org/wiki/Cargo_cult)
- Following [YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it)

## Prerequisite

Install [mise](https://mise.jdx.dev/getting-started.html) — it will handle installing Node.js and pnpm for you.

## Environment Configuration

Copy `.secret.example` to `.secret` and fill in your API keys:

```bash
$ cp .secret.example .secret
$ edit .secret
```

For Stéphane Klein (gopass user), generate `.secret` directly from the password store:

```bash
$ mise run setup-secret
```

Mise loads `.secret` automatically when present — no additional setup needed.

## Getting Started

```bash
$ mise install  # install Node.js and pnpm via mise
$ pnpm install
$ mise run up   # start PostgreSQL container
$ reload        # load environment variables
$ mise migrate  # run database migrations
$ toggl-pg-mirror csv-import toggl-export-data/Toggl_time_entries_2025-01-01_to_2025-12-31.csv
[2026-06-01 13:55:42.423] INFO: CSV import completed {"deleted":2437,"inserted":19583,"dateRange":{"min":"2025-01-01T00:01:53.000Z","max":"2025-12-31T20:03:28.000Z"}}

$ toggl-pg-mirror toggl api-import # -48h by default to now
[2026-06-01 20:43:08.157] INFO: Starting Toggl import {"startDate":"2026-06-01T17:43:08.157Z","endDate":"2026-06-01T20:43:08.157Z"}
[2026-06-01 20:43:08.371] INFO: Fetched time entries from Toggl {"count":7,"startDate":"2026-06-01T17:43:08.157Z","endDate":"2026-06-01T20:43:08.157Z"}
[2026-06-01 20:43:08.372] INFO: Fetched all time entries {"total":7,"pages":1}
[2026-06-01 20:43:08.374] INFO: Import completed {"deletedCsv":0,"deleted":0,"inserted":0,"updated":0,"unchanged":7,"quotaRemaining":"20","quotaResetsIn":"1855"}
[2026-06-01 20:43:08.375] INFO: Toggl import completed {"deletedCsv":0,"deleted":0,"inserted":0,"updated":0,"unchanged":7,"quotaRemaining":"20","quotaResetsIn":"1855"}
[2026-06-01 20:43:08.375] INFO: Toggl API quota: 20 calls remaining, resets in 31 min {"quotaRemaining":"20","quotaResetsIn":"1855"}

$ pnpm dev  # starts SvelteKit dev server with sync daemon
$ curl http://localhost:5173/-/healthy
{"status":"ok"}
$ curl http://localhost:5173/-/ready
{"status":"ok","ready":true}

# or for production:
$ pnpm build && node build

$ mise teardown # stop the database and delete all data
```

## Authentication

### Creating a user

```bash
# With a password (read from stdin, so it is not exposed in the shell history)
$ echo "password" | toggl-pg-mirror add-user --email=user@example.com --password-stdin

# Or with an explicit password and a display name
$ toggl-pg-mirror add-user --email=user@example.com --password=password --display-name="John Doe"
```

### Creating a user via REST API

Set the `TOGGL_PG_MIRROR_ADMIN_TOKEN` environment variable (at least 32
characters), then use the admin API:

```bash
$ curl -s -X POST -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"email":"api-user@example.com","display_name":"API User","password":"password"}' \
    http://localhost:5173/api/v1/admin/users | jq
```

An interactive API reference is available at `/api/reference`, powered by
[Scalar](https://scalar.com/). It reads the OpenAPI 3.0 spec served at
`/api/v1/openapi.json`.

### Provisioning users idempotently (DevOps / GitOps)

The admin API exposes two idempotent operations that let a DevOps / GitOps
workflow reconcile the set of users with a declared desired state:

- `PUT /api/v1/admin/users` — upsert a single user by `email` (create if absent,
  fully replace otherwise, `200` either way).
- `PUT /api/v1/admin/users/sync` — create/update/delete several users in one
  atomic transaction. Body: `{ "upsert": [...], "delete": [{ "email" }] }`.
  Deleting a non-existent email is a no-op. Response: `{ created, updated,
deleted, users }`.

Upsert items may also carry the optional `activity_matrix_categories` field
(an ordered `[{ label, tag, color }]` list, see
[`api-payloads-examples/users-sync.json`](./api-payloads-examples/users-sync.json)
for an example). When omitted, an existing value is kept; an empty array clears
the configuration (the activity matrix is hidden until categories are set).

The workflow is declarative: a configuration file (your GitOps source of truth)
declares the desired users, and a runner applies it to the instance. Because the
operations are idempotent, re-applying the same payload leaves the final state
stable and returns no error — so it is safe to run repeatedly, in any order, and
from a CI/CD pipeline or a reconciliation loop, not just interactively.

A ready-to-use example payload lives in
[`api-payloads-examples/users-sync.json`](./api-payloads-examples/users-sync.json):

```bash
$ curl -fsS -X PUT -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @api-payloads-examples/users-sync.json \
    http://localhost:5173/api/v1/admin/users/sync | jq
```

The first apply reports `created: 2`; editing `display_name` in the file and
re-applying reports `updated: 2`; moving an existing email into `delete` reports
`deleted: 1`. Re-applying the same payload is idempotent — the resulting state
is stable.

Single-user upsert, e.g. create or update `john.doe@example.com`:

```bash
$ curl -s -X PUT -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"email":"john.doe@example.com","display_name":"John Doe","password":"password123"}' \
    http://localhost:5173/api/v1/admin/users | jq
```

### API tokens

Generate tokens from the web UI at `/my/tokens` or via CLI:

```bash
$ toggl-pg-mirror create-api-token --email=user@example.com --name="CI/CD deploy"
```

Tokens are SHA-256 hashed before storage — the raw value is shown only once
at creation. They authenticate requests via the `Authorization: Bearer`
header, which is accepted anywhere a session cookie is.

## Email

Outgoing email is sent via SMTP using [nodemailer](https://nodemailer.com/).
In development, [Mailpit](https://github.com/axllent/mailpit) is started by
`mise run up` and captures every email sent by the application — its web UI
is available at <http://localhost:8025>.

SMTP is configured via environment variables (see `.envrc`):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`
and `TEST_EMAIL_TO`.

### Sending a test email

The admin API exposes `POST /api/v1/admin/send-test-mail` — the subject and
body are hardcoded, only the recipient can be set (defaulting to
`TEST_EMAIL_TO`):

```bash
$ curl -s -X POST http://localhost:5173/api/v1/admin/send-test-mail \
    -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}'
{"data":{"messageId":"<...>","to":"john.doe@example.com","subject":"Test email from toggl-pg-mirror"},...}
```

Or via mise:

```bash
$ mise run send-test-mail
```

## Import CSV via HTTP

The service exposes a POST endpoint for CSV import, useful for browser-based
or scripted uploads. The endpoint sits under the `/api/v1` API, and requests
must authenticate either with a user [API token](#api-tokens) (or a session
cookie from the browser) via the `Authorization: Bearer` header, **or** with the
Toggl admin token:

```bash
$ pnpm dev   # start the dev server

# Create a token and export it
$ export TOGGL_PG_MIRROR_API_TOKEN=$(toggl-pg-mirror create-api-token --email=user@example.com --name="CSV import")

# Basic curl upload
$ curl -X POST http://localhost:5173/api/v1/time-entries/import-csv \
    -H "Authorization: Bearer ${TOGGL_PG_MIRROR_API_TOKEN}" \
    -F "file=@toggl-export-data/Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
{"data":{"deleted":0,"inserted":19583,"dateRange":{"min":"2025-01-01T00:01:53.000Z","max":"2025-12-31T20:03:28.000Z"}},"_links":{"self":{"href":"/api/v1/time-entries/import-csv"}}}

# With xh and fzf for interactive file selection
$ xh -b --form POST http://localhost:5173/api/v1/time-entries/import-csv file@$(fzf) \
    Authorization:"Bearer ${TOGGL_PG_MIRROR_API_TOKEN}"
```

The same endpoint accepts the admin token instead of a user token:

```bash
$ curl -X POST http://localhost:5173/api/v1/time-entries/import-csv \
    -H "Authorization: Bearer ${TOGGL_PG_MIRROR_ADMIN_TOKEN}" \
    -F "file=@toggl-export-data/Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
```

## Help

```bash
$ toggl-pg-mirror --help
toggl-pg-mirror <command>

Commands:
  toggl-pg-mirror csv-import <file>  Import a Toggl CSV export
  toggl-pg-mirror api-import         Import time entries from Toggl API
  toggl-pg-mirror api-ping           Test Toggl API access
  toggl-pg-mirror add-user           Create a user account
  toggl-pg-mirror create-api-token   Create an API token for a user

Options:
  --help          Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --postgres-url  PostgreSQL connection URL                             [string]


Environment variables:
  TOGGL_PG_MIRROR_POSTGRES_URL              PostgreSQL connection URL (e.g.
  postgres://user:pass@localhost:5432/db)
  TOGGL_PG_MIRROR_POSTGRES_SCHEMA           PostgreSQL schema name (default: public)
  TOGGL_PG_MIRROR_TOGGL_API_TOKEN           Toggl API token
  TOGGL_PG_MIRROR_ADMIN_TOKEN               Admin token for the admin API (at least 32 characters)
  TOGGL_PG_MIRROR_POLL_INTERVAL_SECONDS     Sync daemon polling interval in seconds (default: 600)
```

## Build and push container image

```bash
$ mise run build-image
$ mise run login-ghcr
$ mise run push-image
```

Alternatively, build and push via a GitHub Action workflow (manual trigger) instead of a local Podman build:

```bash
$ mise run ci-build-push-image            # on the current branch (ref default: main)
$ mise run ci-build-push-image main       # on a specific ref
$ mise run ci-build-push-image --wait     # trigger, then wait for CI to finish
```

This runs the `build-push-image.yml` workflow through `gh workflow run`. The workflow
requires a `GHCR_PAT` secret (a PAT with `write:packages`) and a `GHCR_USERNAME`
variable to be set in the repository settings.

To configure these repository settings (variable `GHCR_USERNAME` and secret `GHCR_PAT`,
the latter read from `gopass show -o github-cli/token`):

```bash
$ mise run setup-ghcr-actions
```

## Publish Helm chart

```bash
$ mise run login-ghcr-helm    # one-time: authenticate Helm with GHCR
$ mise run publish-chart      # package and push to oci://ghcr.io/stephane-klein/charts
```

The chart is published at `oci://ghcr.io/stephane-klein/charts/toggl-pg-mirror`.

## Deployment Playground

The `deployment-playground/` directory contains a local playground for testing the application in a production-like environment.

## Production Dump Tools

These commands are specific to Stéphane Klein's homelab environment and require
access to his Kubernetes cluster (memex namespace, CNPG cluster `memex-cluster`).

```bash
# Download a logical dump from the production CNPG cluster
$ mise run download-prod-dump
# → dumps/prod/2026-07-18-memex.dump

# Import a dump into the local PostgreSQL database
# Cleans all user schemas first, then restores
$ mise run import-dump-locally dumps/prod/2026-07-18-memex.dump
```

## Documentation

- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records
  (ADR) following the MADR convention. To create one, ask the agent to use
  the skill `.opencode/skills/new-decision/`.
- [`docs/agents/`](docs/agents/) — operational notes for AI agents
  (OpenCode, etc.), loaded on demand.

## Contribution

### Secret detection with gitleaks

[Gitleaks](https://github.com/gitleaks/gitleaks) scans for secrets before they
reach the remote repository. It runs at two points:

- **`git commit`** — the `git-hooks/pre-commit` hook checks staged files.
- **`jj publish`** — local alias that runs `mise run gitleaks-check-push` before
  `jj git push`.

Configuration is in `.gitleaks.toml`.

**One-time setup after clone:**

```bash
$ mise install
$ mise run setup-git-hooks
$ mise run setup-jj-alias
```

**Manual scan** (outside of hooks):

```bash
$ mise run gitleaks-scan        # full project scan
$ mise run gitleaks-check-push  # pre-push scan (called by `jj publish`)
```
