import { sql } from "./pg.js";

export async function getMcpAccessLogPageData({ from, to, page = 1, pageSize = 100 }) {
    const [row] = await sql.unsafe(
        `SELECT get_mcp_access_log_page_data(
            _from => $1::date,
            _to => $2::date,
            _page => $3::int,
            _page_size => $4::int
        ) AS data`,
        [from ?? null, to ?? null, page, pageSize],
        // prepare: false keeps this an unnamed statement, so PostgreSQL always
        // custom-plans it with the real parameter values.
        { prepare: false },
    );

    const data = row.data;

    return {
        rows: data.rows,
        total: data.total,
        page: data.page,
        pageCount: data.page_count,
        from: data.from,
        to: data.to,
    };
}
