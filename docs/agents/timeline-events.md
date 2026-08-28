# Timeline events

Operational snapshot of the `timeline_events` subsystem. See
[`docs/agents/README.md`](./README.md) for what these documents are.

## Purpose

Life events & periods capture declarative life context (milestones and long
periods) independent of the fine-grained time-tracking flow. They are user
authored (not mirrored from Toggl) and hard-deletable.

## Data model

Single table `timeline_events`, one entity for both shapes: a milestone is a
degenerate period (zero duration). `type` is explicit rather than derived from
`start_date = end_date` so a deliberately short period (a one-day trip) cannot
be confused with a milestone.

| Column        | Type        | Notes                                                |
| ------------- | ----------- | ---------------------------------------------------- |
| `id`          | BIGINT      | `GENERATED ALWAYS AS IDENTITY` (project convention)  |
| `type`        | TEXT        | `'milestone'` \| `'period'` (CHECK)                  |
| `category`    | TEXT        | Free text (vacation, employment, sport, education…)  |
| `title`       | TEXT        | Required                                             |
| `start_date`  | DATE        | Required                                             |
| `end_date`    | DATE        | `NULL` = milestone date or ongoing period            |
| `description` | TEXT        | Optional                                             |
| `created_at`  | TIMESTAMPTZ | `DEFAULT NOW()`                                      |
| `updated_at`  | TIMESTAMPTZ | Set explicitly by `updateTimelineEvent` (no trigger) |

## Date invariant

Enforced in the database by the `timeline_events_dates_check` CHECK constraint
and mirrored in the app by `validateTimelineEvent` (`$lib/shared/timeline-event.js`):

- `milestone` → `end_date IS NULL` or `end_date = start_date`
- `period` → `end_date IS NULL` (ongoing) or `end_date > start_date`

Because the invariant lives in both layers, keep them in sync: any change to
the CHECK constraint must ship the matching change to
`validateTimelineEvent` and its tests.

## Page render

Per ADR 002, the `/timeline` page render is served by a single stored function
`get_timeline_events_page_data()` (`sqls/functions.sql`), returning the full
event list as JSON, newest `start_date` first. It is called from
`getTimelineEventsPageData()` in `src/lib/server/timeline-events.js` with
`{ prepare: false }` (unnamed statement, see ADR 002).

The `/charts` Life Periods Gantt is fed by `get_charts_page_data()`
(`sqls/functions.sql`): it returns `timeline_periods` (period-type events
intersecting the window, drawn as bars) and `timeline_milestones`
(milestone-type events whose single date falls in the window, drawn as points
centered on their day column with the title to the right — or to the left when
there is no room). Milestone grouping, sorting and window clipping are shared
in `buildTimelineGantt(periods, milestones, from, to)`
(`src/lib/shared/timeline-gantt.js`).

## Server module

`src/lib/server/timeline-events.js` holds the page-data fetch
(`getTimelineEventsPageData`) and the hard delete (`deleteTimelineEvent`). All
writes (create/update) are colocated in `timelineEvents.remote.js`, which also
owns the command schemas and the value normalization (empty strings → null,
title trim), sharing `validateTimelineEvent` from
`$lib/shared/timeline-event.js`. There is no `?/create` form action anymore.

## Inline editing & creating (remote functions)

`src/routes/(private)/timeline/_components/timelineEvents.remote.js` exposes
two commands — `saveTimelineEvent = command(saveTimelineEventCommandSchema, …)`
and `createTimelineEvent = command(createTimelineEventCommandSchema, …)`. The
command schemas are colocated in the same file and validated by valibot before
the handler runs; the handler then checks the date invariant with
`validateTimelineEvent` (never drifts from the SQL CHECK) and returns the
re-fetched list `{ events }` so the table can refresh its order (a date change
may re-sort it).

`TimelineEventsTable.svelte` ports the `TimeEntriesTable` inline-edit mechanics
with a single `editing` state (`mode: "edit" | "add"`):

- click a row or the row's **Edit** button → an edit row (type select, title,
  category, start_date, end_date, description) with save/cancel;
- the **+ Add event** button above the table → an inline add row with empty
  fields (default type milestone) and a **Create** button;

both with Enter-to-save / Escape-to-cancel / blur-to-cancel. `+page.svelte`
keeps a local `events` state resynced from `data` via `$effect` and passes an
`onSaved` callback that replaces it with the server result.

## Routes

- `/timeline` — list + inline edit/create + delete (`+page.server.js` action
  `?/delete` only), components colocated under `_components/` (see AGENTS.md):
  `TimelineEventsTable.svelte`, `timelineEvents.remote.js`. Inline editing
  replaces the former dedicated edit page; there is no `[id]` route anymore and
  no always-visible create form.

The route file checks `locals.user` explicitly in its action, and the remote
functions check it via `requireUser(getRequestEvent())` (the layout guard alone
does not cover remote functions, same convention as MCP tokens).

## Gotchas

- `postgres` returns `date` columns as JS `Date` objects on raw `SELECT`, but
  `get_timeline_events_page_data()` returns them as `YYYY-MM-DD` strings inside
  the JSONB — the table renders the latter, so all dates flow as strings in the
  UI.
- No soft delete: `deleteTimelineEvent` issues a plain `DELETE`. There is no
  user scoping (single-user app, like `time_entries`).
