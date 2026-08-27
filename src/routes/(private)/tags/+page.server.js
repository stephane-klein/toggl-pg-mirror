import { requireUser } from "$lib/server/require-user.js";
import { listTags } from "$lib/server/tags.js";

export async function load(event) {
    requireUser(event);
    const tags = await listTags();
    return { tags };
}
