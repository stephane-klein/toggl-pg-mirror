import { fail } from "@sveltejs/kit";
import { createPasswordResetToken, hashPassword, verifyPassword } from "$lib/server/auth.js";
import { renderEmail } from "$lib/server/email/index.js";
import { logger } from "$lib/server/logger.js";
import { isMailAvailable, sendMail } from "$lib/server/mailer.js";
import { sql } from "$lib/server/pg.js";

export async function load({ locals }) {
    const [stored] = await sql`SELECT password_hash FROM users WHERE id = ${locals.user.id}`;
    return { hasPassword: Boolean(stored?.password_hash), email: locals.user.email };
}

// Single default action shared by both forms on the page (SvelteKit forbids
// mixing the default action with named actions). A hidden `form` field tells
// which form was submitted.
export const actions = {
    default: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();

        if (data.get("form") === "send-reset-link") {
            return sendResetLink(request, user);
        }

        return updatePassword(user, data);
    },
};

async function updatePassword(user, data) {
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
}

async function sendResetLink(request, user) {
    if (!isMailAvailable()) {
        return { mail_unavailable: true };
    }

    const token = await createPasswordResetToken(user.email);
    if (!token) {
        return { resetSent: true };
    }

    const origin = request.headers.get("origin") || "";
    const resetLink = `${origin}/change-password?token=${token}`;

    try {
        const { subject, text } = renderEmail("reset-password", { link: resetLink });
        await sendMail({ to: user.email, subject, text });
        logger.info({ email: user.email }, "Password reset email sent");
    } catch (err) {
        logger.error({ err, email: user.email }, "Failed to send password reset email");
        return fail(500, { resetError: "Failed to send reset email. Please try again later." });
    }

    return { resetSent: true };
}
