-- Per-user activity matrix categories: the ordered [{ label, tag, color }]
-- array displayed in the /charts activity matrix. NULL or [] means "not
-- configured": no matrix is shown until the user configures categories.
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_matrix_categories jsonb;
