# Security Audit — Unauthenticated access to time entries

- **Date:** 2026-08-23
- **Scope:** verify that no unauthenticated access to the `time_entries`, `time_entry_audit_log`, `time_entry_edit_operations` and `time_entry_edit_operation_entries` tables (and the derived tags view) is possible, and review the login & session security protecting access to that data.
- **Audit baseline:** [0d02584](https://github.com/stephane-klein/toggl-pg-mirror/commit/0d02584e3d6e33bed499f343666161a0cabff593)
- **Status:** no unauthenticated HTTP entry point reaches the sensitive tables.

## Login & session security review

- **Password storage.** Passwords are hashed with argon2id (`hashPassword` in `src/lib/backend/auth.js`, `memoryCost` 19456, `timeCost` 2, `parallelism` 1) and verified via argon2 (`verifyPassword`).
- **Session cookie.** The session cookie is `httpOnly`, `sameSite: "lax"`, `secure` in production, with a 30-day `maxAge`, set on both the password and magic-login flows. On each request the hook validates the session against the database, and when the server-side rolling renewal extends a session it re-issues the cookie so the browser `maxAge` stays aligned with the sliding-window expiry.
- **Session validation.** Sessions are stored in the database. `validateSession` checks `expires_at` (with rolling renewal at mid-life) and the user's `is_active`; an expired session or a deactivated user causes the session to be deleted and rejected.
- **API tokens.** Tokens are stored hashed (SHA-256) in the database. `validateApiToken` checks `is_active` and `expires_at`, rejecting expired tokens (without deleting them, so they stay visible and removable) — an expired token is surfaced as `event.locals.authFailure = "expired"` and `requireUser` responds 401 `"API token expired"`.
- **Magic link & password reset.** Tokens are high-entropy (`nanoid(48)`), stored hashed, single-use (`used`), with short expirations (15 min magic link, 30 min reset).
- **Brute-force protection.** Failed sign-in attempts are recorded in `login_attempts` and throttled per client IP and per email (`src/lib/backend/rate-limit.js`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MS`), returning 429 once a threshold is reached — applied to both the `signIn` and `magicLink` actions.
- **Account enumeration.** `signIn` (`src/routes/(public)/login/+page.server.js`) returns a single generic message for every failure path and equalizes response time by running a real argon2id verification against a dummy hash for unknown or deactivated accounts, so they are indistinguishable from a wrong-password attempt.
- **Token leakage.** A global `Referrer-Policy: no-referrer` header is set on every response (`src/hooks.server.js`) so the one-time magic-login token carried in the callback URL is not forwarded to third-party sites on subsequent navigations.

## Authentication mechanism

- `src/hooks.server.js` populates `event.locals.user` for every request from a session cookie or a Bearer API token, but **rejects nothing** — enforcement is left to each route.
- `src/routes/(private)/+layout.server.js` guards `event.locals.user` and redirects to `/login`. It only runs for page `load()` functions and does **not** protect `+server.js` endpoints or remote functions (`command()` / `query()`).
- `src/lib/server/require-user.js` provides `requireUser(event)`, which throws `error(401, ...)` when no user is present. Every exposed remote function and endpoint that reads or writes the sensitive tables calls it explicitly. When the request used an expired API token, the hook marks `event.locals.authFailure = "expired"` and `requireUser` responds with `"API token expired"`.
- `/api/v1/admin/*` endpoints are protected by a static admin token (`requireAdminToken`), not user sessions.

## Attack surface map

| Path / handler                                                                        | Type            | Auth                             | Data access                       | Status    |
| ------------------------------------------------------------------------------------- | --------------- | -------------------------------- | --------------------------------- | --------- |
| `/time-entries/day/[date]`, `/month/[month]`, `/week/[year]/[week]`, `/range`         | page            | `(private)` layout guard         | read (`getTimeEntriesPageData`)   | Protected |
| RPC `saveTimeEntry`                                                                   | `command()`     | `requireUser(getRequestEvent())` | write + audit                     | Protected |
| RPC `bulkEditTimeEntries`                                                             | `command()`     | `requireUser(getRequestEvent())` | write + audit                     | Protected |
| RPC `getMatchingTimeEntries`                                                          | `command()`     | `requireUser(getRequestEvent())` | read                              | Protected |
| RPC `undoTimeEntryEditOperation`                                                      | `command()`     | `requireUser(getRequestEvent())` | write + audit                     | Protected |
| RPC `getAllTags`                                                                      | `query()`       | `requireUser(getRequestEvent())` | read (tags)                       | Protected |
| `/import-csv/upload`                                                                  | `POST` endpoint | `requireUser(event)`             | write + audit                     | Protected |
| `/api/v1/admin/users*`, `/send-test-mail`                                             | API endpoint    | admin token                      | users only                        | Protected |
| `/-/healthy`, `/-/ready`, `/-/version.json`, `/api/reference`, `/api/v1/openapi.json` | API endpoint    | none                             | **no access** to sensitive tables | N/A (OK)  |

## Verifications performed

- Reviewed every exposed `+server.js` endpoint and every remote function (`command()` / `query()`) that reads or writes the sensitive tables and confirmed each is behind `requireUser`, a layout guard, or `requireAdminToken`.
- Searched `src/` for references to the sensitive tables (`time_entries`, `time_entry_audit_log`, `time_entry_edit_operations`, and the SQL functions `get_time_entries_page_data`, `get_matching_time_entries`). Every HTTP entry point among these references is authenticated; the remaining references live in pure backend modules (`updateTimeEntry.js`, `time-entries.js`, `importer.js`, `csv-importer.js`) reached only from authenticated handlers or the sync daemon.
- Confirmed the unauthenticated paths previously reported are now closed: the four `command()` handlers in `timeEntries.remote.js`, the `getAllTags` query in `tags.remote.js`, and the `/import-csv/upload` endpoint.
- Reviewed the login and session security in `auth.js`, `rate-limit.js`, `hooks.server.js`, `login/+page.server.js`: API tokens are checked for `is_active` and `expires_at`, login attempts are throttled per IP and per email, sign-in responses are equalized to prevent account enumeration, a global `Referrer-Policy: no-referrer` limits magic-link token leakage, and the session cookie is re-issued in sync with the server-side rolling renewal.
- Method: static code review. **Limitation:** no dynamic/e2e exploitation test was run.

## Conclusion

All HTTP entry points that read or write `time_entries`, `time_entry_audit_log`, and the related audit/undo tables require authentication. The remaining unauthenticated endpoints (`/-/healthy`, `/-/ready`, `/-/version.json`, `/api/reference`, `/api/v1/openapi.json`) do not expose data from those tables.

Defense is applied per handler via `requireUser`, not inherited from a route-group layout — a consequence of SvelteKit running layout guards only for page `load()` functions. Pure backend functions carry no identity; authorization is enforced at the handler boundary by construction.
