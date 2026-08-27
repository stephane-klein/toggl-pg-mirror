import { sql } from "./pg.js";

export async function listTags() {
    return sql`
        SELECT t.name, COUNT(e.id)::int AS entry_count
        FROM time_entry_tags t
        LEFT JOIN time_entry_tag_entries jt ON jt.tag_id = t.id
        LEFT JOIN time_entries e ON e.id = jt.entry_id AND e.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY lower(t.name)
    `;
}
