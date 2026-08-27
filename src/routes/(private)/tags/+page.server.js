import { requireUser } from "$lib/server/require-user.js";
import { listTags } from "$lib/server/tags.js";

const VALID_SORTS = ["name_asc", "name_desc", "count_asc", "count_desc"];

function parseSort(value) {
    if (!value || !VALID_SORTS.includes(value)) return { column: "name", dir: "asc" };
    const [column, dir] = value.split("_");
    return { column, dir };
}

function nextSort(column, current) {
    if (current.column === column) {
        return `${column}_${current.dir === "asc" ? "desc" : "asc"}`;
    }
    return `${column}_${column === "count" ? "desc" : "asc"}`;
}

export async function load(event) {
    requireUser(event);
    const sort = parseSort(event.url.searchParams.get("sort"));
    const path = event.url.pathname;
    const tags = await listTags(sort);

    const nameSort = nextSort("name", sort);
    const countSort = nextSort("count", sort);

    return {
        tags,
        sort,
        nameHref: nameSort === "name_asc" ? path : `${path}?sort=${nameSort}`,
        countHref: `${path}?sort=${countSort}`,
    };
}
