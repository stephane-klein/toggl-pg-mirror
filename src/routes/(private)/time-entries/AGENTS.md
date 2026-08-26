# Time entries

## Overview

5 routes (day, week, month, range, list) sharing components under `_components/`.
The header nav (`GoTo`, `ModeSelector`, and the `DayNav`/`WeekNav`/`MonthNav`/
`RangeNav` period navs) is shared with the `/charts` section and lives in
`src/lib/components/` (`$lib/components/`); each view passes its own
`basePath` (`/time-entries` here, `/charts` there).

All nav hrefs pre-computed on the server via `computeTimeEntriesNav(basePath,
url, referenceDate)` and `buildPaginationHrefs()` in
`$lib/shared/timeEntriesUrl.js`, plus `computeGoToData(basePath, url, sort, q,
goto)` in `$lib/server/time-entries.js`.
`modifyCurrentUrl()` in `$lib/url.js` used only for interactive handlers
(DateInput, RangeNav, LimitSelector, SortToggle).

## Rules

1. Never build nav URLs on client — pre-compute in `+page.server.js`.
2. Never import `modifyCurrentUrl` in nav/mode/pagination components.
3. New global query param → add to `hreffy()`.
4. New view-specific param → add to drop list in `hreffy()`.
5. Cursor params (`before`, `after`) never cross period boundaries.

See `docs/agents/time-entries.md` for detailed reference (props, signatures).
