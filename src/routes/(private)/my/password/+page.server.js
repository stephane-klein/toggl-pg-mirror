import { fail } from "@sveltejs/kit";
import { hashPassword, verifyPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";

export async function load({ locals }) {
    const [stored] = await sql`SELECT password_hash FROM users WHERE id = ${locals.user.id}`;
    return { hasPassword: Boolean(stored?.password_hash) };
}

export const actions = {
    default: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const currentPassword = data.get("current-password");
        const newPassword = data.get("new-password");
        const confirm = data.get("confirm");

        if (!newPassword || !confirm) {
            return fail(400, { error: "New password and confirmation are required." });
        }

        if (newPassword.length < 12) {
            return fail(400, { error: "New password must be at least 12 characters." });
        }

        if (newPassword !== confirm) {
            return fail(400, { error: "New passwords do not match." });
        }

        const [stored] = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;

        if (stored?.password_hash) {
            if (!currentPassword) {
                return fail(400, { error: "Current password is required." });
            }

            const valid = await verifyPassword(stored.password_hash, currentPassword);

            if (!valid) {
                return fail(400, { error: "Current password is incorrect." });
            }
        }

        const passwordHash = await hashPassword(newPassword);

        await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = ${new Date()} WHERE id = ${user.id}`;

        return { saved: true };
    },
};
