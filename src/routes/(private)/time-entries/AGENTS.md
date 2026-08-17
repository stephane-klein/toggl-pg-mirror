# Time entries

## Overview

5 routes (day, week, month, range, list) sharing components under `_components/`.
All nav hrefs pre-computed on the server via `computeTimeEntriesNav()` and
`buildPaginationHrefs()` in `$lib/backend/timeEntriesUrl.js`.
`modifyCurrentUrl()` in `$lib/url.js` used only for interactive handlers
(DateInput, RangeNav, LimitSelector, SortToggle).

## Rules

1. Never build nav URLs on client — pre-compute in `+page.server.js`.
2. Never import `modifyCurrentUrl` in nav/mode/pagination components.
3. New global query param → add to `hreffy()`.
4. New view-specific param → add to drop list in `hreffy()`.
5. Cursor params (`before`, `after`) never cross period boundaries.

See `docs/agents/time-entries.md` for detailed reference (props, signatures).
