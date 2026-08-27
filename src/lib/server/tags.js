import { modifyCurrentUrl } from "$lib/url";
import { sql } from "./pg.js";

const VALID_SORTS = ["name_asc", "name_desc", "count_asc", "count_desc", "duration_asc", "duration_desc"];

export function parseSort(value) {
    if (!value || !VALID_SORTS.includes(value)) return { column: "name", dir: "asc" };
    const [column, dir] = value.split("_");
    return { column, dir };
}

export function nextSort(column, current) {
    if (current.column === column) {
        return `${column}_${current.dir === "asc" ? "desc" : "asc"}`;
    }
    return `${column}_${column === "count" || column === "duration" ? "desc" : "asc"}`;
}

export function sortHref(url, value, newPath = null) {
    return modifyCurrentUrl(url, newPath ?? url.pathname, {
        sort: value === "name_asc" ? "" : value,
    });
}

export async function listTagsForPeriod(from, to, sort = "name_asc") {
    const _sort = VALID_SORTS.includes(sort) ? sort : "name_asc";
    return sql.unsafe(
        `SELECT * FROM list_tags(
            _from => $1::date,
            _to => $2::date,
            _sort => $3
        )`,
        [from, to, _sort],
        { prepare: false },
    );
}
