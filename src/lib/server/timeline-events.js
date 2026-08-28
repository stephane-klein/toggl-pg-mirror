import { sql } from "./pg.js";

export async function getTimelineEventsPageData() {
    const [row] = await sql.unsafe(
        `SELECT get_timeline_events_page_data() AS data`,
        [],
        // prepare: false keeps this an unnamed statement (see ADR 002).
        { prepare: false },
    );

    return row.data;
}

export async function deleteTimelineEvent(id) {
    await sql`DELETE FROM timeline_events WHERE id = ${id}`;
}
