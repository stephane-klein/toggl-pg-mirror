import { redirect } from "@sveltejs/kit";

export function load(event) {
    if (!event.locals.user) {
        throw redirect(302, "/login");
    }
}
