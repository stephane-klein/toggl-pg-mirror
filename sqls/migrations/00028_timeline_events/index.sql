-- Life events & periods: declarative temporal context (milestones and long
-- periods) independent of the fine-grained time-tracking flow. A milestone is
-- a degenerate period (zero duration): end_date stays NULL (single date) or is
-- set to start_date for explicitness; a period is either ongoing (end_date
-- NULL) or strictly ended (end_date > start_date). type stays explicit rather
-- than derived from start_date = end_date so a deliberately short period (a
-- one-day trip) cannot be confused with a milestone.
CREATE TABLE IF NOT EXISTS timeline_events (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type        TEXT        NOT NULL CHECK (type IN ('milestone', 'period')),
    category    TEXT,
    title       TEXT        NOT NULL,
    start_date  DATE        NOT NULL,
    end_date    DATE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT timeline_events_dates_check CHECK (
        (type = 'milestone' AND (end_date IS NULL OR end_date = start_date))
        OR
        (type = 'period' AND (end_date IS NULL OR end_date > start_date))
    )
);

-- Timeline view is ordered by start_date (most recent first).
CREATE INDEX IF NOT EXISTS idx_timeline_events_start_date
    ON timeline_events (start_date DESC, id DESC);