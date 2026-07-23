---
status: accepted
date: 2026-07-23
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4 Flash (OpenCode Go)
---

# ADR 001 — URL as global state and SSR-first href construction

## Context and Problem Statement

The time-entries UI (day, week, month, range views) needs to build navigation links that carry certain query parameters while resetting others. Previously each component built its own href strings, leading to prop drilling of URL-only values, inconsistent URL construction, and high friction when adding new global parameters.

## Decision Drivers

- Eliminate prop drilling of URL-only values (`sort`, `q`, `baseQuery`).
- Single source of truth for URL manipulation logic.
- Easy to add new global query parameters in the future.
- Components remain testable (pure function, no store dependency).

## Considered Options

- **A. `modifyCurrentUrl()` utility function** — a pure function that takes the current URL, an optional new path, and a params map (`null` = delete, value = set). Components call it with `$page.url` directly.
- **B. Svelte store or derived store** — wrap URL state in a shared store that components subscribe to.
- **C. Keep per-component string concatenation** — the pre-refactoring approach, with a `withSort()` helper.

## Decision Outcome

Chosen option: **A. `modifyCurrentUrl()` utility function** in `$lib/url.js`.

### Design philosophy — URL as global state

The URL is intentionally the single source of truth for the time-entries page state (mode, period, sort, pagination, search). This is a deliberate choice: this state must survive page refresh, be shareable via URL, be readable by SvelteKit's server `load` functions, and remain independent of JavaScript-only stores. `modifyCurrentUrl()` is the tool that enforces this discipline — all state transitions flow through URL manipulation, never through mutable client-side state.

### Consequences

- Good, because the function is a pure, synchronous, side-effect-free function with a single responsibility.
- Good, because components read `$page.url` directly via SvelteKit's `$page` store — no new stores, no new dependencies.
- Good, because adding a new global parameter (e.g., `q` for search) requires changing only the components that need to carry it.
- Bad, because callers must explicitly list which params to carry vs drop.

### Subsequent evolution — SSR-first href computation

After the initial implementation, href construction was moved from client-side components to the server `load` functions (`+page.server.js`), pushing the "URL as state" philosophy further — since the URL is the source of truth, use it where it first becomes available rather than passing raw cursors to the client.

The same `modifyCurrentUrl()` is now called in two contexts:

- **Server-side**: in `+page.server.js`, wrapped by `hreffy()` and `buildPaginationHrefs()` from `$lib/backend/timeEntriesUrl.js`. These produce complete hrefs (prev/next period, prev/next page, mode switches) and return them in `data`.
- **Client-side**: in interactive handlers only. All navigation links are pure `<a href>` with pre-computed values.

This shift maximizes SSR content generation, reduces client-side JavaScript, and centralises URL construction logic on the server without adding a new abstraction — `modifyCurrentUrl()` remains the single tool, just called earlier in the request lifecycle. Detailed component-by-component breakdown lives in `docs/agents/time-entries.md`.

## Pros and Cons of the Options

### A. `modifyCurrentUrl()` utility function

- Good, because all URL construction flows through a single function with a declarative API.
- Good, because it naturally handles the "carry some params, drop others" pattern without per-component logic.
- Bad, because callers must explicitly list which params to carry vs drop.

### B. Svelte store or derived store

- Good, because components could reactively derive hrefs.
- Bad, because `$page.url` already provides the current URL reactively — wrapping adds indirection.
- Bad, because a store couples URL logic to Svelte's reactivity system, hindering testability.

### C. Keep per-component string concatenation

- Good, because it was already implemented.
- Bad, because the same patterns were repeated across many files with slight variations.
- Bad, because string concatenation is fragile and error-prone.

## More Information

- `$lib/url.js` — `modifyCurrentUrl()` implementation.
- `$lib/backend/timeEntriesUrl.js` — server-side helpers wrapping `modifyCurrentUrl()`.
- `docs/agents/time-entries.md` — detailed component architecture, props, and server data flow.
