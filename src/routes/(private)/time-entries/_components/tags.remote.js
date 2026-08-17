import { query } from "$app/server";

import { sql } from "$lib/backend/pg.js";

export const getAllTags = query(async () => {
    const rows = await sql`
        SELECT DISTINCT unnest(tags) AS tag
        FROM time_entries
        WHERE deleted_at IS NULL
        ORDER BY tag
    `;
    return rows.map((row) => row.tag);
});
