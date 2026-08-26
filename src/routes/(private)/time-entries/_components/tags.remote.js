import { query, getRequestEvent } from "$app/server";

import { requireUser } from "$lib/server/require-user.js";
import { sql } from "$lib/server/pg.js";

export const getAllTags = query(async () => {
    requireUser(getRequestEvent());

    const rows = await sql`
        SELECT DISTINCT name AS tag
        FROM time_entry_tags
        ORDER BY tag
    `;
    return rows.map((row) => row.tag);
});
