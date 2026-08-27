import { sql } from "./pg.js";

const base = sql`
    SELECT t.name, COUNT(e.id)::int AS entry_count
    FROM time_entry_tags t
    LEFT JOIN time_entry_tag_entries jt ON jt.tag_id = t.id
    LEFT JOIN time_entries e ON e.id = jt.entry_id AND e.deleted_at IS NULL
    GROUP BY t.id
`;

export async function listTags({ column = "name", dir = "asc" } = {}) {
    const order =
        column === "count"
            ? dir === "desc"
                ? sql`ORDER BY COUNT(e.id) DESC, lower(t.name)`
                : sql`ORDER BY COUNT(e.id) ASC, lower(t.name)`
            : dir === "desc"
              ? sql`ORDER BY lower(t.name) DESC, t.id`
              : sql`ORDER BY lower(t.name) ASC, t.id`;

    return sql`${base} ${order}`;
}
