import { fail, redirect } from "@sveltejs/kit";
import { hashPassword, usePasswordResetToken, validatePasswordResetToken } from "$lib/backend/auth.js";

export async function load(event) {
    const token = event.url.searchParams.get("token");

    if (!token) {
        throw redirect(302, "/login");
    }

    const resetToken = await validatePasswordResetToken(token);

    if (!resetToken) {
        return { invalid: true };
    }

    return { valid: true, email: resetToken.email };
}

export const actions = {
    default: async ({ request, url }) => {
        const raw = url.searchParams.get("token");

        if (!raw) {
            return fail(400, { error: "Missing reset token." });
        }

        const resetToken = await validatePasswordResetToken(raw);

        if (!resetToken) {
            return fail(400, { error: "Invalid or expired reset token." });
        }

        const data = await request.formData();
        const password = data.get("password");
        const confirm = data.get("confirm");

        if (!password || password.length < 12) {
            return fail(400, { error: "Password must be at least 12 characters." });
        }

        if (password !== confirm) {
            return fail(400, { error: "Passwords do not match." });
        }

        const passwordHash = await hashPassword(password);
        await usePasswordResetToken(resetToken.id, resetToken.user_id, passwordHash);

        throw redirect(302, "/login");
    },
};
