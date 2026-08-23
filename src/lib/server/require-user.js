import { error } from "@sveltejs/kit";

export function requireUser(event) {
    if (!event.locals.user) {
        throw error(401, "Authentication required");
    }

    return event.locals.user;
}
