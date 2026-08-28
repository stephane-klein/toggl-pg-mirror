import { fail } from "@sveltejs/kit";
import { deleteTimelineEvent, getTimelineEventsPageData } from "$lib/server/timeline-events.js";

export async function load() {
    const events = await getTimelineEventsPageData();

    return { events };
}

export const actions = {
    delete: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const id = Number((await request.formData()).get("id"));
        if (!Number.isSafeInteger(id) || id <= 0) {
            return fail(400, { error: "Invalid event id." });
        }

        await deleteTimelineEvent(id);

        return { deleted: true };
    },
};
