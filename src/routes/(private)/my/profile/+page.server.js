import { fail } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";

export function load(event) {
    return {
        user: event.locals.user,
    };
}

export const actions = {
    default: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const displayName = data.get("display-name");
        const email = data.get("email");

        if (!email) {
            return fail(400, { error: "Email is required." });
        }

        await sql`UPDATE users SET display_name = ${displayName || email}, email = ${email}, updated_at = ${new Date()} WHERE id = ${user.id}`;

        return { saved: true };
    },
};
