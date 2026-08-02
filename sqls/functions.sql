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
