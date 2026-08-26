# Time entries — URL conventions and component architecture

## Overview

The time-entries UI is split into 5 routes (day, week, month, range, and the default list view) that share a common set of components under `_components/`. The header nav (`GoTo`, `ModeSelector`, and the `DayNav`/`WeekNav`/`MonthNav`/`RangeNav` period navs) is shared with the `/charts` section and lives in `src/lib/components/` (`$lib/components/`); each view passes its own `basePath` (`/time-entries` here, `/charts` there). All navigation hrefs are pre-computed on the server via `computeTimeEntriesNav(basePath, url, referenceDate)` and `buildPaginationHrefs()` in `$lib/shared/timeEntriesUrl.js`, plus `computeGoToData(basePath, url, sort, q, goto)` in `$lib/server/time-entries.js`. The client-side utility `modifyCurrentUrl()` is used only for interactive handlers (GoTo DateInput, RangeNav, LimitSelector, SortToggle).

## Server-side URL construction — `$lib/shared/timeEntriesUrl.js`

### `computeTimeEntriesNav(basePath, url, referenceDate)`

Pre-computes all navigation hrefs needed by `GoTo`, `ModeSelector`, `DayNav`, `WeekNav`, and `MonthNav`. Returns an object with:

| Property                                                                   | Description                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `goToDayHref`, `goToWeekHref`, `goToMonthHref`, `goToYearHref`             | Mode switch links carrying `sort`, `q`, `limit`      |
| `modeDayHref`, `modeWeekHref`, `modeMonthHref`                             | Mode links for `ModeSelector`                        |
| `rangeFromDayHref`, `rangeFromWeekHref`, `rangeFromMonthHref`, `rangeHref` | Range view links                                     |
| `prevHref`, `nextHref`                                                     | Prev/next period nav links (drops `before`, `after`) |
| `prevLabel`, `nextLabel`                                                   | Human-readable labels for nav                        |
| `today`, `referenceDate`                                                   | ISO date strings                                     |
| `currentYear`, `currentWeek`                                               | For week view                                        |
| `currentMonth`                                                             | For month view                                       |
| `q`, `sort`, `limit`                                                       | Extracted from URL                                   |

### `hreffy(url, path, extra)`

Builds a href by carrying `sort`, `q`, `limit` from the current URL, dropping all view-specific params (`before`, `after`, `from`, `to`, `date`, `year`, `week`, `month`, `selected`), and optionally adding extra params.

### `buildPaginationHrefs(url, prevCursor, nextCursor, sort)`

Returns `{ prevPageHref, nextPageHref }` — full hrefs with cursor params, respecting sort direction (asc = prev = older with `before`, desc = prev = newer with `after`).

### `computeGoToData(basePath, url, sort, q, goto)` — in `$lib/server/time-entries.js`

Returns `firstNonEmpty*Href` and `todayHasEntries`/`*HasEntries` booleans. The presence flags and nearest-day values come from the single SQL payload (`goto`), produced by `getTimeEntriesPageData()`. Uses `modifyCurrentUrl` to build hrefs that carry `sort`, `q` and target the correct period.

### `getTimeEntriesPageData({ from, to, before, after, limit, sort, q, prevFrom, prevTo, nextFrom, nextTo })` — in `$lib/server/time-entries.js`

Single round-trip backend for every time-entries view. Calls the stored function `get_time_entries_page_data()` (see `sqls/migrations/00006_time_entries_page_data/index.sql`) and returns `{ entries, prevCursor, nextCursor, total, prevHasEntries, nextHasEntries, nearestPeriodDay, goto }`. Each route passes its view-specific prev/next period bounds (day: ±1 day, week: ±7 days, month: ±1 month, range: `null`).

## Client-side URL utility — `$lib/url.js`

### `modifyCurrentUrl(currentUrl, newPath, params)`

Signature: `modifyCurrentUrl(currentUrl, newPath, params)`

- `currentUrl` — `URL` object or string (typically `$page.url`).
- `newPath` — pathname to switch to, or `null` to keep the current path. Must NOT contain a query string.
- `params` — object where keys are param names: `null` or `""` deletes the param, any value sets it.

The current query string is always preserved: only the params listed in `params`
are added, updated or deleted (`null`/`""`). Params not listed (e.g. `q`, `sort`,
`limit`) survive a path switch — interactive handlers (DateInput, WeekNav,
MonthNav, RangeNav) must therefore only pass the params they want to change or
drop. URL builders that want a clean slate (`hreffy()`,
`computeTimeEntriesNav()`, `computeGoToData()`) list every possible param,
including the view-specific drops, so they behave as a full reset.

Returns `"${pathname}${search}"` (relative URL string).

Used in interactive handlers:

- `GoTo.svelte` — `goToDate()` sets `sort`, `q`; `goToFirstNonEmpty()` navigates via pre-computed href
- `RangeNav.svelte` — `goToRange()` sets `from`, `to`
- `LimitSelector.svelte` — sets `limit`
- `SortToggle.svelte` — toggles `sort`
- `WeekNav.svelte`, `MonthNav.svelte` — debounced input handlers

## Components and their props

All navigation hrefs are pre-computed on the server. Components receive them directly:
The shared header nav (`GoTo`, `ModeSelector`, `DayNav`, `WeekNav`, `MonthNav`,
`RangeNav`) lives in `src/lib/components/` (`$lib/components/`); the rest stay
under `time-entries/_components/`. Each period nav takes a required `basePath`
prop (`/time-entries` or `/charts`).

| Component          | Props                                                                                                          | Notes                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GoTo`             | `goTo*Href`, `firstNonEmpty*Href`, `*HasEntries`                                                               | Navigates via pre-computed hrefs; `goToDate()` uses `modifyCurrentUrl` for the DateInput handler |
| `ModeSelector`     | `mode*Href`, `range*Href`                                                                                      | Pure links, no client-side URL construction                                                      |
| `DayNav`           | `prevHref`, `prevLabel`, `nextHref`, `nextLabel`, `currentDate`, `nearestNonEmptyHref`, `nearestNonEmptyLabel` | Pure links                                                                                       |
| `WeekNav`          | Same pattern + `currentYear`, `currentWeek`                                                                    | Debounced goToWeek uses `modifyCurrentUrl`                                                       |
| `MonthNav`         | Same pattern + `currentMonth`                                                                                  | Debounced goToMonth uses `modifyCurrentUrl`                                                      |
| `RangeNav`         | `currentFrom`, `currentTo`                                                                                     | `goToRange()` uses `modifyCurrentUrl`                                                            |
| `LimitSelector`    | `mode`                                                                                                         | Reads `$page.url` for current `limit`, uses `modifyCurrentUrl` to set it                         |
| `SortToggle`       | `sort`                                                                                                         | Reads `$page.url`, uses `modifyCurrentUrl` to toggle `sort`                                      |
| `TimeEntriesTable` | `entries`, `sort`, `prevPageHref`, `nextPageHref`                                                              | Pagination links are pre-computed hrefs                                                          |
| `Pagination`       | `prevPageHref`, `nextPageHref`, `entries`                                                                      | Same                                                                                             |

## Server — `+page.server.js` responsibility

Each view's `+page.server.js` calls `computeTimeEntriesNav(basePath, url, referenceDate)` (with `basePath` set to `"/time-entries"` for this section, `"/charts"` for the charts mirror) and `buildPaginationHrefs(url, prevCursor, nextCursor, sort)` to produce all hrefs, then passes them in `data`:

```js
export const load = async ({ url, params, locals }) => {
  const navData = computeTimeEntriesNav("/time-entries", url, referenceDate);
  const { entries, prevCursor, nextCursor, total } = await loadEntries(/* ... */);
  const { prevPageHref, nextPageHref } = buildPaginationHrefs(url, prevCursor, nextCursor, sort);

  return {
    ...navData,
    ...gotoData,
    entries,
    total,
    prevPageHref,
    nextPageHref,
  };
};
```

## Query parameter inventory

| Param          | Scope                  | Pre-computed in                                 |
| -------------- | ---------------------- | ----------------------------------------------- |
| `sort`         | carried by `hreffy()`  | `computeTimeEntriesNav`, `buildPaginationHrefs` |
| `q`            | carried by `hreffy()`  | `computeTimeEntriesNav`                         |
| `limit`        | carried by `hreffy()`  | `computeTimeEntriesNav`                         |
| `before`       | cursor (per-view)      | `buildPaginationHrefs`                          |
| `after`        | cursor (per-view)      | `buildPaginationHrefs`                          |
| `date`         | day view               | route param                                     |
| `year`, `week` | week view              | route params                                    |
| `month`        | month view             | route param                                     |
| `from`, `to`   | range view             | `RangeNav` interactive handler                  |
| `selected`     | current view selection | `TimeEntriesTable` URL state                    |

## Selection states

Selection is persisted in the `selected` query param and survives pagination
(`buildPaginationHrefs` carries it, `hreffy()` drops it when changing period or
view). Two mutually exclusive states:

- **Explicit page selection** — `selected=id1,id2,…`. Only the entries displayed
  on the current page (as before; `parseSelectionState` prunes to the page).
- **All matching selection** — `selected=all` (the sentinel). Selects every entry
  matching the current view filter, across all pages. The ids are **not** listed
  in the URL: they are resolved server-side at action time by the stored
  function `get_matching_time_entries()` (same predicate as the `total` CTE of
  `get_time_entries_page_data`). The scope follows the current URL filter — if
  the user changes the filter while the sentinel is active, the selection
  re-scopes (the header label always shows the live count).

`parseSelectionState(raw, entries)` (`$lib/shared/timeEntriesSelection.js`)
returns `{ selectedIds, selectAllMatching }` for both forms; each view's
`+page.server.js` exposes `selectAllMatching` in `data`.

UI transitions (`TimeEntriesTable` header):

| State                    | Header                                   | Action                                                     |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------- |
| Nothing selected         | `[□] Select all · 50 shown · 358 match…` | —                                                          |
| 50 on this page selected | `[☑] 50 selected on this page`           | link `Select all 358 matching entries` when `total > page` |
| All matching selected    | `[☑] All 358 matching entries selected`  | link `Select only the 50 on this page`                     |

In "all matching" mode the bulk edit (`bulkEditTimeEntries` with
`selectAllMatching`) resolves the target ids via `get_matching_time_entries()`
and the copy/export actions fetch the full matching rows through the
`getMatchingTimeEntries` command. Clicking an individual row checkbox leaves
"all matching" and switches to an explicit page selection that excludes that row.

## The `q` filter DSL

`q` mixes **description words/phrases** and **tag filters** (`#tag`). It is parsed
by `splitFilter()` in `src/lib/shared/tagFilter.js`, which calls
`svelte-codemirror-search-field/parser` with `implicitOp: "and"` and
`implicitAutoCloseParents: true` — the same options the SearchField component
(`_components/TimeEntryFilter.svelte`) is hardcoded with, so the server
accepts exactly what the UI shows.

- Description words: space-separated, quoted phrases `"…"` for exact match —
  the legacy `_q` DSL, with `/null` matching empty descriptions.
- Tags: `#tag` with case-insensitive matching; `and`/`or`/`not` (or `et`,
  `ou`, `non`, `&&`, `||`, `!`), parentheses, implicit `and` between
  juxtaposed blocs.
- `or`/`not` may only combine **tags**, never description words — mixing them
  under `or`/`not` throws (a `400` from the server, or a client-side
  « Invalid filter » line since `TimeEntryFilter` validates on input).
- `splitFilter` produces `{ description, tags }`: the description words
  re-serialized for the `_q` parameter, and the tag expression as a DNF
  (`[{ and: [...], not: [...] }, ...]`, OR over conjuncts) for the `_tags`
  jsonb parameter of `get_time_entries_page_data()`.
- The tag list for autocomplete comes live from
  `_components/tags.remote.js` (`getAllTags` remote function, `SELECT DISTINCT
  name FROM time_entry_tags` — tags are normalized in the dimension table,
  not stored as a TEXT[] column on time_entries).

## Rules for contributors

1. **Never build navigation URLs on the client** — all nav hrefs must be pre-computed in `+page.server.js` via `computeTimeEntriesNav()` / `buildPaginationHrefs()`.
2. **Never import `modifyCurrentUrl` in nav/mode/pagination components** — use only in interactive handlers (DateInput, RangeNav, LimitSelector, SortToggle).
3. **When adding a new globally-carried query parameter**, add it to `hreffy()` in `$lib/shared/timeEntriesUrl.js`.
4. **When adding a new view-specific param**, add it to the drop list in `hreffy()`.
5. **Cursor params (`before`, `after`) must never cross period boundaries** — `hreffy()` drops them automatically.
