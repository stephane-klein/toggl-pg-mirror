# toggl-pg-mirror

A Node.js service that mirrors Toggl time-tracking data into a self-controlled PostgreSQL database, keeping it in sync to serve as a source of truth. Enables querying and enriching historical data — e.g., via LLMs — for weekly, monthly, or per-activity time reports.

## Tech Stack

- Runtime: Node.js 24 (ESM)
- Package manager: pnpm
- Database: PostgreSQL 18
- SQL client: [postgres](https://github.com/porsager/postgres)
- Migrations: [postgres-shift](https://github.com/porsager/postgres-shift)
- Containers: Podman Compose
- Tooling: mise

## AI-Assisted Development

This project was developed using:

- [OpenCode](https://opencode.ai) CLI — coding assistant workflow (not vibe coding)
- Models: GLM-5.1, Minimax-M2.5, Minimax-M.7

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
$ toggl-pg-mirror import toggle-export-data/Toggl_time_entries_2025-01-01_to_2025-12-31.csv
[2026-06-01 13:55:42.423] INFO: CSV import completed {"deleted":2437,"inserted":19583,"dateRange":{"min":"2025-01-01T00:01:53.000Z","max":"2025-12-31T20:03:28.000Z"}}

$ toggl-pg-mirror toggl api-import # -48h by default to now
[2026-06-01 20:43:08.157] INFO: Starting Toggl import {"startDate":"2026-06-01T17:43:08.157Z","endDate":"2026-06-01T20:43:08.157Z"}
[2026-06-01 20:43:08.371] INFO: Fetched time entries from Toggl {"count":7,"startDate":"2026-06-01T17:43:08.157Z","endDate":"2026-06-01T20:43:08.157Z"}
[2026-06-01 20:43:08.372] INFO: Fetched all time entries {"total":7,"pages":1}
[2026-06-01 20:43:08.374] INFO: Import completed {"deletedCsv":0,"deleted":0,"inserted":0,"updated":0,"unchanged":7,"quotaRemaining":"20","quotaResetsIn":"1855"}
[2026-06-01 20:43:08.375] INFO: Toggl import completed {"deletedCsv":0,"deleted":0,"inserted":0,"updated":0,"unchanged":7,"quotaRemaining":"20","quotaResetsIn":"1855"}
[2026-06-01 20:43:08.375] INFO: Toggl API quota: 20 calls remaining, resets in 31 min {"quotaRemaining":"20","quotaResetsIn":"1855"}

$ toggl-pg-mirror start-api-sync  # starts the periodic sync daemon (14-day sliding window, every 10 min by default)
[2026-06-01 21:21:27.458] INFO: Sync daemon starting {"pollIntervalSeconds":600}
[2026-06-01 21:21:27.460] INFO: Sync daemon started {"pollIntervalSeconds":600}
[2026-06-01 21:21:27.779] INFO: Fetched time entries from Toggl {"count":698,"startDate":"2026-05-18T21:21:27.461Z","endDate":"2026-06-01T21:21:27.461Z"}
[2026-06-01 21:21:27.780] INFO: Fetched all time entries {"total":698,"pages":1}
[2026-06-01 21:21:27.910] INFO: Import completed {"deletedCsv":601,"deleted":0,"inserted":594,"updated":1,"unchanged":103,"quotaRemaining":"29","quotaResetsIn":"3600"}
[2026-06-01 21:21:27.910] INFO: Sync cycle completed {"deletedCsv":601,"deleted":0,"inserted":594,"updated":1,"unchanged":103,"quotaRemaining":"29","quotaResetsIn":"3600"}

$ mise teardown # stop the database and delete all data

## Deployment Playground

The `deployment-playground/` directory contains a local playground for testing the application in a production-like environment.
```
