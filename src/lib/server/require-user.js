import { error } from "@sveltejs/kit";

export function requireUser(event) {
    if (!event.locals.user) {
        throw error(401, event.locals.authFailure === "expired" ? "API token expired" : "Authentication required");
    }

    return event.locals.user;
}
