# Time entries — URL conventions and component architecture

## Overview

The time-entries UI is split into 5 routes (day, week, month, range, and the default list view) that share a common set of components under `_components/`. All navigation hrefs are pre-computed on the server via `computeTimeEntriesNav()` and `buildPaginationHrefs()` in `$lib/backend/timeEntriesUrl.js`. The client-side utility `modifyCurrentUrl()` is used only for interactive handlers (GoTo DateInput, RangeNav, LimitSelector, SortToggle).

## Server-side URL construction — `$lib/backend/timeEntriesUrl.js`

### `computeTimeEntriesNav(url, referenceDate)`

Pre-computes all navigation hrefs needed by `GoTo`, `ModeSelector`, `DayNav`, `WeekNav`, and `MonthNav`. Returns an object with:

| Property | Description |
|---|---|
| `goToDayHref`, `goToWeekHref`, `goToMonthHref`, `goToYearHref` | Mode switch links carrying `sort`, `q`, `limit` |
| `modeDayHref`, `modeWeekHref`, `modeMonthHref` | Mode links for `ModeSelector` |
| `rangeFromDayHref`, `rangeFromWeekHref`, `rangeFromMonthHref`, `rangeHref` | Range view links |
| `prevHref`, `nextHref` | Prev/next period nav links (drops `before`, `after`) |
| `prevLabel`, `nextLabel` | Human-readable labels for nav |
| `today`, `referenceDate` | ISO date strings |
| `currentYear`, `currentWeek` | For week view |
| `currentMonth` | For month view |
| `q`, `sort`, `limit` | Extracted from URL |

### `hreffy(url, path, extra)`

Builds a href by carrying `sort`, `q`, `limit` from the current URL, dropping all view-specific params (`before`, `after`, `from`, `to`, `date`, `year`, `week`, `month`), and optionally adding extra params.

### `buildPaginationHrefs(url, prevCursor, nextCursor, sort)`

Returns `{ prevPageHref, nextPageHref }` — full hrefs with cursor params, respecting sort direction (asc = prev = older with `before`, desc = prev = newer with `after`).

### `computeGoToData(url, sort, q)` — in `$lib/backend/time-entries.js`

Returns `firstNonEmpty*Href` and `todayHasEntries`/`*HasEntries` booleans. Uses `modifyCurrentUrl` to build hrefs that carry `sort`, `q` and target the correct period.

## Client-side URL utility — `$lib/url.js`

### `modifyCurrentUrl(currentUrl, newPath, params)`

Signature: `modifyCurrentUrl(currentUrl, newPath, params)`

- `currentUrl` — `URL` object or string (typically `$page.url`).
- `newPath` — pathname to switch to, or `null` to keep the current path. Must NOT contain a query string.
- `params` — object where keys are param names: `null` or `""` deletes the param, any value sets it.

Returns `"${pathname}${search}"` (relative URL string).

Used in interactive handlers:
- `GoTo.svelte` — `goToDate()` sets `sort`, `q`; `goToFirstNonEmpty()` navigates via pre-computed href
- `RangeNav.svelte` — `goToRange()` sets `from`, `to`
- `LimitSelector.svelte` — sets `limit`
- `SortToggle.svelte` — toggles `sort`
- `WeekNav.svelte`, `MonthNav.svelte` — debounced input handlers

## Components and their props

All navigation hrefs are pre-computed on the server. Components receive them directly:

| Component | Props | Notes |
|---|---|---|
| `GoTo` | `goTo*Href`, `firstNonEmpty*Href`, `*HasEntries` | Navigates via pre-computed hrefs; `goToDate()` uses `modifyCurrentUrl` for the DateInput handler |
| `ModeSelector` | `mode*Href`, `range*Href` | Pure links, no client-side URL construction |
| `DayNav` | `prevHref`, `prevLabel`, `nextHref`, `nextLabel`, `currentDate`, `nearestNonEmptyHref`, `nearestNonEmptyLabel` | Pure links |
| `WeekNav` | Same pattern + `currentYear`, `currentWeek` | Debounced goToWeek uses `modifyCurrentUrl` |
| `MonthNav` | Same pattern + `currentMonth` | Debounced goToMonth uses `modifyCurrentUrl` |
| `RangeNav` | `currentFrom`, `currentTo` | `goToRange()` uses `modifyCurrentUrl` |
| `LimitSelector` | `mode` | Reads `$page.url` for current `limit`, uses `modifyCurrentUrl` to set it |
| `SortToggle` | `sort` | Reads `$page.url`, uses `modifyCurrentUrl` to toggle `sort` |
| `TimeEntriesTable` | `entries`, `sort`, `prevPageHref`, `nextPageHref` | Pagination links are pre-computed hrefs |
| `Pagination` | `prevPageHref`, `nextPageHref`, `entries` | Same |

## Server — `+page.server.js` responsibility

Each view's `+page.server.js` calls `computeTimeEntriesNav(url, referenceDate)` and `buildPaginationHrefs(url, prevCursor, nextCursor, sort)` to produce all hrefs, then passes them in `data`:

```js
export const load = async ({ url, params, locals }) => {
    const navData = computeTimeEntriesNav(url, referenceDate);
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

| Param | Scope | Pre-computed in |
|---|---|---|
| `sort` | carried by `hreffy()` | `computeTimeEntriesNav`, `buildPaginationHrefs` |
| `q` | carried by `hreffy()` | `computeTimeEntriesNav` |
| `limit` | carried by `hreffy()` | `computeTimeEntriesNav` |
| `before` | cursor (per-view) | `buildPaginationHrefs` |
| `after` | cursor (per-view) | `buildPaginationHrefs` |
| `date` | day view | route param |
| `year`, `week` | week view | route params |
| `month` | month view | route param |
| `from`, `to` | range view | `RangeNav` interactive handler |

## Rules for contributors

1. **Never build navigation URLs on the client** — all nav hrefs must be pre-computed in `+page.server.js` via `computeTimeEntriesNav()` / `buildPaginationHrefs()`.
2. **Never import `modifyCurrentUrl` in nav/mode/pagination components** — use only in interactive handlers (DateInput, RangeNav, LimitSelector, SortToggle).
3. **When adding a new globally-carried query parameter**, add it to `hreffy()` in `$lib/backend/timeEntriesUrl.js`.
4. **When adding a new view-specific param**, add it to the drop list in `hreffy()`.
5. **Cursor params (`before`, `after`) must never cross period boundaries** — `hreffy()` drops them automatically.
