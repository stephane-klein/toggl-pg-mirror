-- Persisted SQL functions, loaded idempotently at the end of every migration run
-- (see src/migrate.js). This file is the single source of truth for the project's
-- functions: DROP then CREATE, so both body edits and signature changes are safe
-- on re-run. The whole file executes inside one transaction.
--
-- Conventions:
-- - Function names must be unique in the schema (DROP without an argument list).
-- - Functions may depend on anything created by migrations (tables, indexes,
--   immutable_unaccent), never the reverse: migrations run before this file loads
--   and must not call functions defined here.
-- - A migration that drops or renames a table used here must ship the matching
--   update of this file, otherwise the next `pnpm migrate` fails loudly here.

DROP FUNCTION IF EXISTS get_time_entries_page_data;
DROP FUNCTION IF EXISTS nearest_day_with_entries;
DROP FUNCTION IF EXISTS upsert_time_entries;

-- Returns the day (as 'YYYY-MM-DD') closest to _ref that has at least one
-- non-deleted entry, or NULL when no entry exists on either side of _ref.
CREATE FUNCTION nearest_day_with_entries(_ref date) RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
    SELECT day
    FROM (
        (SELECT started_at::date::text AS day
         FROM time_entries
         WHERE deleted_at IS NULL
           AND started_at::date < _ref
         ORDER BY started_at DESC
         LIMIT 1)
        UNION ALL
        (SELECT started_at::date::text AS day
         FROM time_entries
         WHERE deleted_at IS NULL
           AND started_at::date > _ref
         ORDER BY started_at ASC
         LIMIT 1)
    ) t
    ORDER BY abs(day::date - _ref), day ASC
    LIMIT 1
$$;

-- Returns the full page payload for a time-entries view in a single round-trip:
-- the paginated entries (up to _limit + 1 rows so the caller can detect has_more),
-- the period total, prev/next period presence, and the "go to" metadata
-- (today / week / month presence and their nearest non-empty day).
CREATE FUNCTION get_time_entries_page_data(
    _from date,                     -- period start (inclusive)
    _to date,                       -- period end (exclusive)
    _q text,                        -- description filter: '' none, '/null' IS NULL, '"…"' phrase, else space-separated words (tags split off into _tags by the caller)
    _limit integer,                 -- page size; returns _limit + 1 rows so the caller detects has_more
    _asc boolean,                   -- ordering: true = (started_at, id) ASC, false = DESC
    _before_started_at timestamptz, -- cursor (prev page): rows strictly before this started_at
    _before_id bigint,              -- cursor tie-breaker id (same point as _before_started_at)
    _after_started_at timestamptz,  -- cursor (next page): rows strictly after this started_at
    _after_id bigint,               -- cursor tie-breaker id (same point as _after_started_at)
    _prev_from date,                -- previous period start (inclusive) → prev_period_has_entries
    _prev_to date,                  -- previous period end (exclusive)
    _next_from date,                -- next period start (inclusive) → next_period_has_entries
    _next_to date,                  -- next period end (exclusive)
    _goto_today_from date,          -- "today" range start (inclusive) → goto.today_has_entries
    _goto_today_to date,            -- "today" range end (exclusive)
    _goto_week_from date,           -- current ISO week start, Monday (inclusive) → goto.week_has_entries
    _goto_week_to date,             -- current week end (exclusive)
    _goto_month_from date,          -- current month start (inclusive) → goto.month_has_entries
    _goto_month_to date,            -- current month end (exclusive)
    _tags jsonb                     -- tag filter as DNF: [{ and: [...], not: [...] }, ...] OR NULL
) RETURNS jsonb
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
    WITH
    -- page: two UNION ALL branches mutually exclusive on _asc (WHERE _asc /
    -- WHERE NOT _asc). Called with prepare:false (unnamed statement, always
    -- custom-planned), the inactive branch folds away at plan time and the
    -- active one becomes an index-ordered scan with early-exit LIMIT.
    page AS (
        (
            -- ascending ordering: first page and after-cursor navigation
            SELECT id, description, tags, started_at, ended_at
            FROM time_entries
            WHERE _asc
              AND deleted_at IS NULL
              AND started_at >= _from::timestamptz
              AND started_at < _to::timestamptz
              AND (
                  _q IS NULL
                  OR _q = ''
                  OR (_q = '/null' AND description IS NULL)
                  OR (
                      left(_q, 1) = '"'
                      AND right(_q, 1) = '"'
                      AND (
                          substring(_q, 2, length(_q) - 2) = ''
                          OR description ILIKE immutable_unaccent(substring(_q, 2, length(_q) - 2))
                      )
                  )
                  OR (
                      _q <> '/null'
                      AND NOT (left(_q, 1) = '"' AND right(_q, 1) = '"')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM unnest(string_to_array(_q, ' ')) w
                          WHERE immutable_unaccent(description) NOT ILIKE immutable_unaccent('%' || w || '%')
                      )
                  )
              )
              AND (
                  _tags IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(_tags) AS conj(j)
                      WHERE immutable_lower(tags) @> ARRAY(
                                SELECT immutable_lower(v)
                                FROM jsonb_array_elements_text(conj.j -> 'and') AS v
                            )
                        AND NOT (
                            immutable_lower(tags) && ARRAY(
                                SELECT immutable_lower(v)
                                FROM jsonb_array_elements_text(conj.j -> 'not') AS v
                            )
                        )
                  )
              )
              AND (
                  (_before_started_at IS NULL AND _after_started_at IS NULL)
                  OR (
                      _before_started_at IS NOT NULL
                      AND (started_at, id) < (_before_started_at, _before_id)
                  )
                  OR (
                      _after_started_at IS NOT NULL
                      AND (started_at, id) > (_after_started_at, _after_id)
                  )
              )
            ORDER BY started_at ASC, id ASC
            LIMIT _limit + 1
        )
        UNION ALL
        (
            -- descending ordering: sort=desc and before-cursor navigation
            SELECT id, description, tags, started_at, ended_at
            FROM time_entries
            WHERE NOT _asc
              AND deleted_at IS NULL
              AND started_at >= _from::timestamptz
              AND started_at < _to::timestamptz
              AND (
                  _q IS NULL
                  OR _q = ''
                  OR (_q = '/null' AND description IS NULL)
                  OR (
                      left(_q, 1) = '"'
                      AND right(_q, 1) = '"'
                      AND (
                          substring(_q, 2, length(_q) - 2) = ''
                          OR description ILIKE immutable_unaccent(substring(_q, 2, length(_q) - 2))
                      )
                  )
                  OR (
                      _q <> '/null'
                      AND NOT (left(_q, 1) = '"' AND right(_q, 1) = '"')
                      AND NOT EXISTS (
                          SELECT 1
                          FROM unnest(string_to_array(_q, ' ')) w
                          WHERE immutable_unaccent(description) NOT ILIKE immutable_unaccent('%' || w || '%')
                      )
                  )
              )
              AND (
                  _tags IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(_tags) AS conj(j)
                      WHERE immutable_lower(tags) @> ARRAY(
                                SELECT immutable_lower(v)
                                FROM jsonb_array_elements_text(conj.j -> 'and') AS v
                            )
                        AND NOT (
                            immutable_lower(tags) && ARRAY(
                                SELECT immutable_lower(v)
                                FROM jsonb_array_elements_text(conj.j -> 'not') AS v
                            )
                        )
                  )
              )
              AND (
                  (_before_started_at IS NULL AND _after_started_at IS NULL)
                  OR (
                      _before_started_at IS NOT NULL
                      AND (started_at, id) < (_before_started_at, _before_id)
                  )
                  OR (
                      _after_started_at IS NOT NULL
                      AND (started_at, id) > (_after_started_at, _after_id)
                  )
              )
            ORDER BY started_at DESC, id DESC
            LIMIT _limit + 1
        )
    ),
    total AS (
        SELECT count(*) AS n
        FROM time_entries
        WHERE deleted_at IS NULL
          AND started_at >= _from::timestamptz
          AND started_at < _to::timestamptz
          AND (
              _q IS NULL
              OR _q = ''
              OR (_q = '/null' AND description IS NULL)
              OR (
                  left(_q, 1) = '"'
                  AND right(_q, 1) = '"'
                  AND (
                      substring(_q, 2, length(_q) - 2) = ''
                      OR description ILIKE immutable_unaccent(substring(_q, 2, length(_q) - 2))
                  )
              )
              OR (
                  _q <> '/null'
                  AND NOT (left(_q, 1) = '"' AND right(_q, 1) = '"')
                  AND NOT EXISTS (
                      SELECT 1
                      FROM unnest(string_to_array(_q, ' ')) w
                      WHERE immutable_unaccent(description) NOT ILIKE immutable_unaccent('%' || w || '%')
                  )
              )
          )
          AND (
              _tags IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(_tags) AS conj(j)
                  WHERE immutable_lower(tags) @> ARRAY(
                            SELECT immutable_lower(v)
                            FROM jsonb_array_elements_text(conj.j -> 'and') AS v
                        )
                    AND NOT (
                        immutable_lower(tags) && ARRAY(
                            SELECT immutable_lower(v)
                            FROM jsonb_array_elements_text(conj.j -> 'not') AS v
                        )
                    )
              )
          )
    ),
    prev_has AS (
        SELECT EXISTS (
            SELECT 1
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= _prev_from::timestamptz
              AND started_at < _prev_to::timestamptz
        )
    ),
    next_has AS (
        SELECT EXISTS (
            SELECT 1
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= _next_from::timestamptz
              AND started_at < _next_to::timestamptz
        )
    ),
    goto_today_has AS (
        SELECT EXISTS (
            SELECT 1
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= _goto_today_from::timestamptz
              AND started_at < _goto_today_to::timestamptz
        )
    ),
    goto_week_has AS (
        SELECT EXISTS (
            SELECT 1
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= _goto_week_from::timestamptz
              AND started_at < _goto_week_to::timestamptz
        )
    ),
    goto_month_has AS (
        SELECT EXISTS (
            SELECT 1
            FROM time_entries
            WHERE deleted_at IS NULL
              AND started_at >= _goto_month_from::timestamptz
              AND started_at < _goto_month_to::timestamptz
        )
    ),
    nearest_period_day AS (
        SELECT CASE
            WHEN (SELECT * FROM prev_has) OR (SELECT * FROM next_has) THEN NULL
            ELSE nearest_day_with_entries(_from)
        END
    ),
    nearest_today_day AS (
        SELECT CASE
            WHEN (SELECT * FROM goto_today_has) THEN NULL
            ELSE nearest_day_with_entries(_goto_today_from)
        END
    ),
    nearest_week_day AS (
        SELECT CASE
            WHEN (SELECT * FROM goto_week_has) THEN NULL
            ELSE nearest_day_with_entries(_goto_week_from)
        END
    ),
    nearest_month_day AS (
        SELECT CASE
            WHEN (SELECT * FROM goto_month_has) THEN NULL
            ELSE nearest_day_with_entries(_goto_month_from)
        END
    )
    SELECT jsonb_build_object(
        'entries', COALESCE((
            SELECT jsonb_agg(x)
            FROM (
                SELECT id::text AS id, description, tags, started_at, ended_at, started_at::text AS started_at_txt
                FROM page
            ) x
        ), '[]'::jsonb),
        'total', (SELECT n FROM total),
        'prev_period_has_entries', (SELECT * FROM prev_has),
        'next_period_has_entries', (SELECT * FROM next_has),
        'nearest_period_day', (SELECT * FROM nearest_period_day),
        'goto', jsonb_build_object(
            'today_has_entries', (SELECT * FROM goto_today_has),
            'nearest_today_day', (SELECT * FROM nearest_today_day),
            'week_has_entries', (SELECT * FROM goto_week_has),
            'nearest_week_day', (SELECT * FROM nearest_week_day),
            'month_has_entries', (SELECT * FROM goto_month_has),
            'nearest_month_day', (SELECT * FROM nearest_month_day)
        )
    );
$$;

-- Upserts time entries (insert new + update changed) and writes the matching
-- audit trail in a single statement. The field-level diff is computed in SQL
-- via IS DISTINCT FROM, so each changed field yields one audit row.
-- _entries is a JSON array; each object mirrors the time_entries columns plus
-- the API-side updated_at used to guard stale updates.
--
-- Matching: an existing row is resolved by the local id when it is provided,
-- otherwise by toggl_uid (NULL toggl_uid always inserts — e.g. CSV imports and
-- UI-created entries have no Toggl counterpart). _source = 'manual' freezes the
-- row against the Toggl sync (manually_edited_at = NOW()); other sources leave
-- the existing freeze untouched.
--
-- Example (fictional): a UI creates one manual entry (no Toggl counterpart).
--
--     SELECT upsert_time_entries(
--         _entries => '[
--             {
--                 "toggl_uid": null,
--                 "started_at": "2026-08-16T09:00:00+02:00",
--                 "ended_at": "2026-08-16T10:30:00+02:00",
--                 "tags": ["meeting", "client"],
--                 "description": "Sprint planning with Acme Corp",
--                 "project": "Engineering",
--                 "updated_at": "2026-08-16T08:00:00+02:00"
--             }
--         ]'::jsonb,
--         _source => 'manual',
--         _import_source => 'api_sync'
--     );
--
--     Returns: {"inserted": 1, "updated": 0, "unchanged": 0}
--
--     The same statement also writes the audit row:
--     (entry_id, source, field_changed, old_value, new_value) =
--     (…, 'manual', '_created', NULL,
--      '{"started_at": "2026-08-16T09:00:00+02:00", "ended_at": "2026-08-16T10:30:00+02:00",
--        "description": "Sprint planning with Acme Corp", "project": "Engineering",
--        "tags": ["meeting", "client"]}'::jsonb)
--
-- Example (fictional): a manual edit of an existing entry (id given, only the
-- description changes). A single audit row for 'description' is written and the
-- entry is frozen via manually_edited_at.
--
--     SELECT upsert_time_entries(
--         _entries => '[
--             {
--                 "id": 42,
--                 "toggl_uid": 313131,
--                 "started_at": "2026-08-16T09:00:00+02:00",
--                 "ended_at": "2026-08-16T10:30:00+02:00",
--                 "tags": ["meeting", "client"],
--                 "description": "Sprint planning with Acme Corp",
--                 "project": "Engineering",
--                 "updated_at": "2026-08-16T08:05:00+02:00"
--             }
--         ]'::jsonb,
--         _source => 'manual',
--         _import_source => 'api_sync'
--     );
--
--     Returns: {"inserted": 0, "updated": 1, "unchanged": 0}
CREATE FUNCTION upsert_time_entries(
    _entries       jsonb,           -- [{ id?, toggl_uid, started_at, ended_at, tags, description, project, updated_at }]
    _source        text,            -- audit source: 'toggl' | 'manual' | 'llm' | 'csv'
    _import_source varchar(10)
) RETURNS jsonb                     -- { inserted, updated, unchanged }
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
BEGIN
    WITH
    input AS (
        SELECT id, toggl_uid, started_at, ended_at, tags, description, project, updated_at
        FROM jsonb_to_recordset(_entries) AS t(
            id bigint, toggl_uid bigint, started_at timestamptz, ended_at timestamptz,
            tags text[], description text, project text, updated_at timestamptz
        )
    ),
    existing AS (
        SELECT te.id, te.toggl_uid, te.started_at, te.ended_at, te.tags,
               te.description, te.project, te.updated_at
        FROM time_entries te
        JOIN input i
          ON (i.id IS NOT NULL AND te.id = i.id)
          OR (i.id IS NULL AND i.toggl_uid IS NOT NULL AND te.toggl_uid = i.toggl_uid)
    ),
    to_update AS (
        SELECT e.id, e.toggl_uid
        FROM existing e
        JOIN input i
          ON (i.id IS NOT NULL AND e.id = i.id)
          OR (i.id IS NULL AND i.toggl_uid IS NOT NULL AND e.toggl_uid = i.toggl_uid)
        WHERE i.updated_at > e.updated_at
          AND (
              e.started_at IS DISTINCT FROM i.started_at
              OR e.ended_at IS DISTINCT FROM i.ended_at
              OR e.tags IS DISTINCT FROM i.tags
              OR e.description IS DISTINCT FROM i.description
              OR e.project IS DISTINCT FROM i.project
          )
    ),
    inserted AS (
        INSERT INTO time_entries (toggl_uid, started_at, ended_at, tags, description, project, import_source, manually_edited_at)
        SELECT i.toggl_uid, i.started_at, i.ended_at, COALESCE(i.tags, '{}'),
               i.description, i.project, _import_source,
               CASE WHEN _source = 'manual' THEN NOW() END
        FROM input i
        LEFT JOIN existing e
          ON (i.id IS NOT NULL AND e.id = i.id)
          OR (i.id IS NULL AND i.toggl_uid IS NOT NULL AND e.toggl_uid = i.toggl_uid)
        WHERE e.id IS NULL
        RETURNING id, started_at, ended_at, tags, description, project
    ),
    audit_created AS (
        INSERT INTO time_entry_audit_log (entry_id, source, field_changed, old_value, new_value)
        SELECT ins.id, _source, '_created', NULL,
               jsonb_build_object(
                   'started_at', ins.started_at,
                   'ended_at', ins.ended_at,
                   'description', ins.description,
                   'project', ins.project,
                   'tags', ins.tags
               )
        FROM inserted ins
    ),
    updated AS (
        UPDATE time_entries te
        SET started_at = i.started_at,
            ended_at = i.ended_at,
            tags = COALESCE(i.tags, '{}'),
            description = i.description,
            project = i.project,
            updated_at = NOW(),
            manually_edited_at = CASE WHEN _source = 'manual' THEN NOW() ELSE te.manually_edited_at END
        FROM input i
        JOIN to_update u
          ON (i.id IS NOT NULL AND u.id = i.id)
          OR (i.id IS NULL AND i.toggl_uid IS NOT NULL AND u.toggl_uid = i.toggl_uid)
        WHERE te.id = u.id
        RETURNING te.id
    ),
    audit_updated AS (
        INSERT INTO time_entry_audit_log (entry_id, source, field_changed, old_value, new_value)
        SELECT u.id, _source, ch.field_changed, ch.old_value, ch.new_value
        FROM updated u
        JOIN existing e ON e.id = u.id
        JOIN input i
          ON (i.id IS NOT NULL AND e.id = i.id)
          OR (i.id IS NULL AND i.toggl_uid IS NOT NULL AND e.toggl_uid = i.toggl_uid)
        CROSS JOIN LATERAL (
            SELECT 'started_at', to_jsonb(e.started_at), to_jsonb(i.started_at)
            WHERE e.started_at IS DISTINCT FROM i.started_at
            UNION ALL SELECT 'ended_at', to_jsonb(e.ended_at), to_jsonb(i.ended_at)
            WHERE e.ended_at IS DISTINCT FROM i.ended_at
            UNION ALL SELECT 'tags', to_jsonb(e.tags), to_jsonb(i.tags)
            WHERE e.tags IS DISTINCT FROM i.tags
            UNION ALL SELECT 'description', to_jsonb(e.description), to_jsonb(i.description)
            WHERE e.description IS DISTINCT FROM i.description
            UNION ALL SELECT 'project', to_jsonb(e.project), to_jsonb(i.project)
            WHERE e.project IS DISTINCT FROM i.project
        ) ch(field_changed, old_value, new_value)
    )
    SELECT jsonb_build_object(
        'inserted', (SELECT count(*) FROM inserted),
        'updated', (SELECT count(*) FROM updated),
        'unchanged', (SELECT count(*) FROM existing) - (SELECT count(*) FROM updated)
    ) INTO result;

    RETURN result;
END;
$$;
