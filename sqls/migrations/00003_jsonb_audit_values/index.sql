CREATE OR REPLACE FUNCTION _migrate_jsonb(val TEXT) RETURNS JSONB AS $$
BEGIN
    IF val IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN val::jsonb;
EXCEPTION WHEN OTHERS THEN
    RETURN to_jsonb(val);
END;
$$ LANGUAGE plpgsql;

ALTER TABLE time_entry_audit_log
    ALTER COLUMN old_value TYPE JSONB USING _migrate_jsonb(old_value),
    ALTER COLUMN new_value TYPE JSONB USING _migrate_jsonb(new_value);

DROP FUNCTION IF EXISTS _migrate_jsonb(TEXT);