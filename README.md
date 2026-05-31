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
$ mise seed     # populate with demo data
$ ./src/hello_world.js  # sample application
contacts: Result(3) [
  {
    id: '1',
    firstname: 'Alice',
    lastname: 'Martin',
    created_at: 2026-05-24T14:08:06.606Z
  },
  {
    id: '2',
    firstname: 'Bob',
    lastname: 'Durand',
    created_at: 2026-05-24T14:08:06.606Z
  },
  {
    id: '3',
    firstname: 'Charlie',
    lastname: 'Petit',
    created_at: 2026-05-24T14:08:06.606Z
  }
]
$ mise teardown # stop the database and delete all data

## Deployment Playground

The `deployment-playground/` directory contains a local playground for testing the application in a production-like environment.
```


