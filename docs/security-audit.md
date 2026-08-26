# Security Audit — Unauthenticated access to time entries

- **Date:** 2026-08-25
- **Scope:** verify that no unauthenticated access to the `time_entries`, `time_entry_audit_log`, `time_entry_edit_operations` and `time_entry_edit_operation_entries` tables (and the derived tags view) is possible, and review the login & session security protecting access to that data. This run covers the read-only MCP server added at `/mcp/readonly` (commit `xusstlsl`), which exposes `time_entries` over raw SQL.
- **Audit baseline:** [e415b245](https://github.com/stephane-klein/toggl-pg-mirror/commit/e415b2451d21f20795eeecc89e7393d643027553) (change `xusstlsl`)
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

## MCP read-only server security review (`/mcp/readonly`)

- **Authentication.** Every request (`GET`, `POST`, `DELETE`) is checked by `authorize()` in `src/routes/(mcp)/mcp/readonly/+server.js` before anything else: it requires `Authorization: Bearer <mcp-token>` and validates the token via `validateMcpToken`. Invalid or expired tokens get a 401 JSON-RPC error. The endpoint is **not** protected by any layout guard (SvelteKit only runs those for page `load()` functions), so it enforces its own auth — same pattern as remote functions.
- **MCP tokens.** Created per user at `/my/mcp-tokens/`, high-entropy (`nanoid(48)`), stored hashed (SHA-256) in `mcp_tokens`. `validateMcpToken` checks the user's `is_active` and `expires_at`, updating `last_used` on each valid request. Expired tokens are rejected but not deleted, so they stay visible and removable in the UI.
- **Session binding.** The `mcp-session-id` header is bound to the token that created the session (`entry.tokenId !== user.id` → 404), so a different token cannot ride on an existing session. Sessions are idle-pruned after 30 minutes and capped at `MAX_SESSIONS` (200, 503 beyond). Sessions are held in memory only — they are lost on process restart or worker switch (a client simply re-initializes; this fails closed).
- **Database role (defense in depth).** Queries run as a dedicated role (`toggl_mcp_reader`, created at startup by `ensureMcpReaderRole`) with `SELECT`-only privileges on `time_entries`, plus `EXECUTE` on the fuzzy-search helpers `immutable_unaccent` and `immutable_lower`. `immutable_unaccent` is `SECURITY DEFINER`, so the reader can run accent-insensitive searches through it without direct `EXECUTE` on the `unaccent` extension function. The role enforces `default_transaction_read_only = on`, `statement_timeout = '10s'` and `idle_in_transaction_session_timeout = '10s'`. Identifiers are regex-validated (`ROLE_NAME_REGEX`, `SCHEMA_NAME_REGEX`) and the password is SQL-escaped before being embedded in `ALTER ROLE ... PASSWORD`. If the reader password env var is unset, the DB client is not created and the endpoint returns 503 (fail closed).
- **Function execution privileges (default-deny).** `sqls/functions.sql` now ends with a `DO` block that revokes `EXECUTE ON ALL FUNCTIONS IN SCHEMA ... FROM PUBLIC` and sets `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE`, so only the owning app role can call stored functions unless an explicit per-function `GRANT EXECUTE` exists. The MCP reader role therefore cannot invoke the page-data functions (`get_time_entries_page_data`, `get_mcp_access_log_page_data`, …).
- **Audit trail.** Every tool call records `token_id`, `user_id`, `session_id`, client name/version, IP, the full query, the stated `purpose` and success/failure in `mcp_access_log`; a recording failure is logged but never breaks the tool response. The log is read through `get_mcp_access_log_page_data` (a stored function, not PUBLIC-executable).

### Residual observations (accepted, not vulnerabilities)

- Raw SQL is accepted **by design** through `sqlReadonly.unsafe(...)`; it is contained by the read-only role and the 10 s statement timeout. The reader role can still read `pg_catalog`/`information_schema` metadata (table and role names) and `pg_stat_activity` (queries of other sessions), and run public `pg_catalog` functions such as `pg_sleep` — bounded by the timeout and the reader pool (`max: 5`).
- There is no rate limit on `/mcp/readonly`. Brute-forcing a 48-character token is infeasible, but a token holder can issue many queries back-to-back; impact is bounded by the 5-connection pool and the 10 s timeout.
- The `mcp_access_log` stores query text, `purpose` and IP in plaintext, visible to every authenticated user on `/mcp/log`. This matches the single-workspace data model (the `time_entries` table has no user column; all users share the same Toggl workspace), but it is cross-user data within the instance.
- `query` is unbounded in length, so an authenticated token holder could bloat the access log. Minor.
- `.secret.example` generates the reader password with `openssl rand -base64 24`; base64 can contain `+` and `/`, which are not URL-safe inside the connection-string userinfo interpolated by `buildReaderUrl` (`src/lib/server/mcp/mcp-readonly-db.js`) and may break the reader connection. It fails closed (the reader client is never usable), but a hex or base64url password is safer. The dev `.envrc` uses a hex token.

## Attack surface map

| Path / handler                                                                        | Type            | Auth                                            | Data access                           | Status    |
| ------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------- | ------------------------------------- | --------- |
| `/time-entries/day/[date]`, `/month/[month]`, `/week/[year]/[week]`, `/range`         | page            | `(private)` layout guard                        | read (`getTimeEntriesPageData`)       | Protected |
| RPC `saveTimeEntry`                                                                   | `command()`     | `requireUser(getRequestEvent())`                | write + audit                         | Protected |
| RPC `bulkEditTimeEntries`                                                             | `command()`     | `requireUser(getRequestEvent())`                | write + audit                         | Protected |
| RPC `getMatchingTimeEntries`                                                          | `command()`     | `requireUser(getRequestEvent())`                | read                                  | Protected |
| RPC `undoTimeEntryEditOperation`                                                      | `command()`     | `requireUser(getRequestEvent())`                | write + audit                         | Protected |
| RPC `getAllTags`                                                                      | `query()`       | `requireUser(getRequestEvent())`                | read (tags)                           | Protected |
| `/api/v1/time-entries/import-csv`                                                     | `POST` endpoint | user (`event.locals.user`) or admin token       | write + audit                         | Protected |
| `/api/v1/admin/users*`, `/send-test-mail`                                             | API endpoint    | admin token                                     | users only                            | Protected |
| `/mcp/readonly` (`GET`/`POST`/`DELETE`)                                               | API endpoint    | per-user MCP token (Bearer, `validateMcpToken`) | read via read-only SQL role           | Protected |
| `/mcp/log`                                                                            | page            | `(private)` layout guard                        | read (`get_mcp_access_log_page_data`) | Protected |
| `/my/mcp-tokens`                                                                      | page            | `(private)` layout guard                        | own MCP tokens                        | Protected |
| `/mcp`                                                                                | page            | none                                            | **no access** to sensitive tables     | N/A (OK)  |
| `/-/healthy`, `/-/ready`, `/-/version.json`, `/api/reference`, `/api/v1/openapi.json` | API endpoint    | none                                            | **no access** to sensitive tables     | N/A (OK)  |

## Verifications performed

- Reviewed every exposed `+server.js` endpoint and every remote function (`command()` / `query()`) that reads or writes the sensitive tables and confirmed each is behind `requireUser`, a layout guard, or `requireAdminToken`.
- Searched `src/` for references to the sensitive tables (`time_entries`, `time_entry_audit_log`, `time_entry_edit_operations`, and the SQL functions `get_time_entries_page_data`, `get_matching_time_entries`). Every HTTP entry point among these references is authenticated; the remaining references live in pure backend modules (`updateTimeEntry.js`, `time-entries.js`, `importer.js`, `csv-importer.js`) reached only from authenticated handlers or the sync daemon.
- Confirmed the unauthenticated paths previously reported are now closed: the four `command()` handlers in `timeEntries.remote.js`, the `getAllTags` query in `tags.remote.js`, and the `/api/v1/time-entries/import-csv` endpoint.
- Reviewed the MCP server added in `xusstlsl`: `authorize()` gates every HTTP method before any session is created; MCP sessions are bound to the creating token; the queries run as a dedicated `SELECT`-only PostgreSQL role with a read-only transaction and timeouts; and `sqls/functions.sql` now revokes `EXECUTE` from `PUBLIC` on all stored functions (default-deny), with explicit grants only for the reader role's fuzzy-search helpers.
- Reviewed the login and session security in `auth.js`, `rate-limit.js`, `hooks.server.js`, `login/+page.server.js`: API tokens are checked for `is_active` and `expires_at`, login attempts are throttled per IP and per email, sign-in responses are equalized to prevent account enumeration, a global `Referrer-Policy: no-referrer` limits magic-link token leakage, and the session cookie is re-issued in sync with the server-side rolling renewal.
- Method: static code review. **Limitation:** no dynamic/e2e exploitation test was run.

## Conclusion

All HTTP entry points that read or write `time_entries`, `time_entry_audit_log`, and the related audit/undo tables require authentication. The new `/mcp/readonly` surface is authenticated by a per-user MCP token and further constrained at the database level by a `SELECT`-only role — no unauthenticated path reaches the time-tracking data. The remaining unauthenticated endpoints (`/-/healthy`, `/-/ready`, `/-/version.json`, `/api/reference`, `/api/v1/openapi.json`, `/mcp`) do not expose data from those tables.

Defense is applied per handler via `requireUser` (and, for MCP, via `authorize()` in the endpoint itself), not inherited from a route-group layout — a consequence of SvelteKit running layout guards only for page `load()` functions. Pure backend functions carry no identity; authorization is enforced at the handler boundary by construction. The MCP surface relies on defense in depth: HTTP token authentication plus a database role that cannot write and cannot reach any table other than `time_entries`.
