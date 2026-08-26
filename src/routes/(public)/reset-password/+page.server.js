import { fail } from "@sveltejs/kit";
import { createPasswordResetToken } from "$lib/server/auth.js";
import { renderEmail } from "$lib/server/email/index.js";
import { logger } from "$lib/server/logger.js";
import { isMailAvailable, sendMail } from "$lib/server/mailer.js";

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get("email");

        if (!email) {
            return fail(400, { error: "Email is required." });
        }

        if (!isMailAvailable()) {
            return { mail_unavailable: true };
        }

        const token = await createPasswordResetToken(email);

        if (!token) {
            return { sent: true, email };
        }

        const origin = request.headers.get("origin") || "";
        const resetLink = `${origin}/change-password?token=${token}`;

        try {
            const { subject, text } = renderEmail("reset-password", { link: resetLink });
            await sendMail({ to: email, subject, text });
            logger.info({ email }, "Password reset email sent");
        } catch (err) {
            logger.error({ err, email }, "Failed to send password reset email");
            return fail(500, { error: "Failed to send reset email. Please try again later." });
        }

        return { sent: true, email, resetLink };
    },
};
