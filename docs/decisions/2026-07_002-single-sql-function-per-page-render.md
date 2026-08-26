---
status: accepted
date: 2026-07-31
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4 Flash (OpenCode Go)
---

# ADR 002 — One stored SQL function (CTE + JSON) per page render

## Context and Problem Statement

A page render often needs several values derived from the same tables: a paginated list, its total, presence flags for neighbouring periods, and lookups such as the nearest non-empty day. Orchestrating these values from JavaScript means one PostgreSQL round-trip per value. A round-trip is more than network latency: the driver serializes parameters, the server parses and plans the statement, executes it, serializes the result, and the client parses it back into objects — and the JS orchestration forces intermediate values to cross that boundary and re-apply the same filters in separate statements. On a remote deployment network latency dominates; locally, the repeated parse/plan/execute cycles and result parsing still add up. The time-entries page was the first victim: rendering one page (e.g. `/time-entries/day/2026-07-21/`) issued up to 11 queries (15 in the worst case), all derived from the same `time_entries` table with narrow, index-friendly predicates.

## Decision Drivers

- Reduce the number of round-trips per page render (target: one) — a general rule that applies to every page in the application, not just time-entries.
- Let the planner see the whole page in one statement: one parse and one plan instead of N, with intermediate datasets computed once and reused across CTEs (materialized CTEs) instead of re-scanned per consumer.
- Keep intermediate values inside the database: only the final JSON payload crosses the process boundary, no JS marshalling or re-applied filters between sub-queries.
- Keep page data correct and stable: identical ordering, pagination cursors, presence flags, and nearest-day semantics as before.
- Follow the project's established SQL pattern (stored functions in migrations, e.g. `immutable_unaccent`) and the CTE + JSON style.
- Keep the dynamic query parameters (filters, sort direction, cursor) expressible in a single static statement.

## Considered Options

- **A. One stored SQL function per page render** — a single function returning one JSONB payload, defined in `sqls/functions.sql`, with CTEs for the page, total, presence flags, and lookups.
- **B. One big inline CTE query built in raw SQL in JavaScript**, no function.
- **C. Hybrid two-query approach** — keep the paginated page query dynamic in JavaScript and merge only the metadata (total + presence + nearest) into one CTE query.
- **D. Status quo** — the N-queries orchestration from JavaScript.

## Decision Outcome

Chosen option: **A. One stored SQL function per page render**.

Every page that needs several values derived from the database is served by a single stored SQL function returning one JSONB document, built with CTEs for the page, total, presence flags, and lookups. The JavaScript load layer decodes the JSON, applies view-specific post-processing (pagination cursors, reversal), and passes a shaped object to the routes. A page render therefore costs **one round-trip** regardless of how many values it needs.

Beyond the round-trip count, the single-statement shape gives the planner the whole page at once: the function body is a single statement (a `LANGUAGE sql` function with one SELECT is inlined), intermediate values such as total, presence flags and nearest days never leave PostgreSQL, and any dataset referenced by several CTEs is computed once and reused instead of re-scanned.

The functions live in the single file `sqls/functions.sql`. It is loaded
idempotently at the end of every migration run by `src/migrate.js` (DROP + CREATE inside
one transaction), so body edits and signature changes take effect on the next `pnpm migrate`.

### First application: the time-entries page

The time-entries page was the first application of this rule. Two functions were created:

- `nearest_day_with_entries(_ref date) RETURNS text` — the day closest to `_ref` with at least one non-deleted entry (before/after probes + closest pick), or `NULL`.
- `get_time_entries_page_data(...)` — a single `LANGUAGE sql STABLE PARALLEL SAFE` function taking the period, query params (`_q`, `_limit`, `_asc`), the pagination cursors, the prev/next period bounds, and the "go to" bounds (today / week / month). It returns one JSONB document:

```json
{
  "entries": [ { "id", "description", "tags", "started_at", "ended_at", "started_at_txt" }, ... ],
  "total": 66,
  "prev_period_has_entries": true,
  "next_period_has_entries": true,
  "nearest_period_day": null,
  "goto": {
    "today_has_entries": false, "nearest_today_day": "...",
    "week_has_entries": false, "nearest_week_day": "...",
    "month_has_entries": true, "nearest_month_day": null
  }
}
```

The JavaScript adapter `getTimeEntriesPageData()` in `src/lib/server/time-entries.js` decodes the JSON, keeps the exact post-processing of the previous implementation (`has_more` pop, reversal for `before` / `after`+`desc`, cursor encoding), and returns a shaped object consumed by the four routes. `computeGoToData()` keeps only href/label construction; the presence and nearest data come from the SQL payload.

### Consequences

- Good, because a page render now costs **one round-trip** instead of 11–15.
- Good, because a single statement replaces 11–15 parse/plan/execute cycles and result-set parsings in the driver with one parse, one plan and one JSON payload to decode.
- Good, because intermediate values stay in the database — no JS orchestration between sub-queries, no repeated marshalling of the same filtered dataset.
- Good, because functions live in `sqls/functions.sql` and reload idempotently (DROP + CREATE) at the end of every migration run: body edits or signature changes take effect on the next `pnpm migrate` without a new migration.
- Good, because the SQL is testable in isolation (`SELECT get_time_entries_page_data(...)`) and self-documents the page contract.
- Good, because `entries` ids are emitted as text (`id::text`) to preserve the previous `postgres` driver behavior (BIGINT as string) and safe cursor encoding.
- Bad, because the time-entries function signature has 19 parameters (many of them date bounds); the call site is verbose but explicit.
- Good, because the page `ORDER BY` uses two direction-guarded `UNION ALL` branches (`WHERE _asc` / `WHERE NOT _asc`) instead of conditional `CASE` expressions: under a custom plan the inactive branch is folded away (`One-Time Filter: false`) and the page becomes an index-ordered scan with early-exit `LIMIT` (reads `_limit + 1` rows instead of sorting the whole period).
- Good, because the `prepare: false` call (`src/lib/server/time-entries.js`) keeps the statement unnamed, so PostgreSQL always custom-plans it with the real parameter values. Branch pruning, index-only counts and selectivity-aware plans all depend on this invariant.
- Good, because the partial index `idx_time_entries_started_at_id_active (started_at DESC, id DESC) WHERE deleted_at IS NULL` (migration `00006_index_time_entries_active`) turns the period count and the presence probes into index-only scans (previously range scans with heap rechecks, or a full-table `Seq Scan` for a wide range count).
- Good, because the redundant `ORDER BY` inside `jsonb_agg` was removed: the page CTE already sorts, so the JSON payload inherits the order and one `Sort` node is saved.
- Bad, because the time-entries description filter predicate is inlined twice (page + total CTEs), re-scanning `time_entries` instead of sharing one materialized base CTE. Deliberate: sharing would spool the whole filtered period and lose the index-ordered scan with early-exit `LIMIT`; at the current scale (~60k rows) the duplication is negligible.

## Pros and Cons of the Options

### A. One stored SQL function per page render

- Good, because it achieves the single round-trip goal with a clean, testable contract.
- Good, because stored functions are already a project pattern (`immutable_unaccent`).
- Bad, because of the parameter count and the verbosity of the two direction-guarded `UNION ALL` branches (the page predicates are duplicated).

### B. One big inline CTE query in JavaScript

- Good, because no function is needed.
- Bad, because the giant query would live in the route layer, harder to test in isolation than a function.
- Bad, because the full SQL text is shipped to PostgreSQL and re-parsed on every call — with `prepare: false` (custom plans) nothing is cached server-side, so a multi-KB CTE crosses the network and is re-parsed per render, whereas a stored function call transmits only a short reference and parses its body once at creation.

### C. Hybrid two-query approach

- Good, because the dynamic page query stays index-optimal.
- Bad, because it keeps two round-trips and still orchestrates from JavaScript, only partially addressing the driver.

### D. Status quo

- Good, because already implemented and correct.
- Bad, because it issues 11–15 round-trips per render.

## More Information

- `sqls/functions.sql` — the function definitions (loaded at the end of every migration run).
- `sqls/migrations/00006_index_time_entries_active/` — the partial index enabling index-only counts and presence probes.
- `src/lib/server/time-entries.js` — the `getTimeEntriesPageData` adapter (first application) and the `prepare: false` invariant.
- Measurements (EXPLAIN ANALYZE, ~60k rows): day view 50.0 → 33.5 ms, one-year range 69.7 → 42.5 ms; the range count dropped from a full `Seq Scan` (10.7 ms) to an index-only scan (3.3 ms).
- Regression: verified by EXPLAIN ANALYZE before/after and by exercising the five time-entries routes across sort asc/desc, `q` filter, and `before`/`after` cursor pagination with zero behavioral differences.
