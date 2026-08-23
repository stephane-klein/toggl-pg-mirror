import { fail, redirect } from "@sveltejs/kit";
import { createMagicLoginToken, createSession, SESSION_COOKIE_NAME, verifyPassword } from "$lib/backend/auth.js";
import { renderEmail } from "$lib/backend/email/index.js";
import { logger } from "$lib/backend/logger.js";
import { isMailAvailable, sendMail } from "$lib/backend/mailer.js";
import { sql } from "$lib/backend/pg.js";
import { clearLoginAttempts, isLoginThrottled, registerLoginAttempt } from "$lib/backend/rate-limit.js";

const THROTTLE_MESSAGE = "Too many sign-in attempts. Please try again later.";

export const actions = {
    signIn: async ({ request, cookies, getClientAddress }) => {
        const data = await request.formData();
        const email = data.get("email");
        const password = data.get("password");

        if (!email || !password) {
            return fail(400, { error: "Email and password are required." });
        }

        const ip = getClientAddress();

        if (await isLoginThrottled({ ip, email, action: "password" })) {
            return fail(429, { error: THROTTLE_MESSAGE });
        }

        const [user] = await sql`
            SELECT id, email, display_name, password_hash, is_active FROM users WHERE email = ${email}
        `;

        if (!user || !user.password_hash) {
            return fail(400, { error: "Invalid email or password." });
        }

        if (!user.is_active) {
            return fail(400, { error: "This account is deactivated." });
        }

        const valid = await verifyPassword(user.password_hash, password);

        if (!valid) {
            await registerLoginAttempt({ ip, email, action: "password", success: false });
            return fail(400, { error: "Invalid email or password." });
        }

        await clearLoginAttempts({ ip, email });

        const session = await createSession(user.id);

        cookies.set(SESSION_COOKIE_NAME, session.id, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60,
        });

        throw redirect(302, "/");
    },

    magicLink: async ({ request, getClientAddress }) => {
        const data = await request.formData();
        const email = data.get("email");

        if (!email) {
            return fail(400, { magicLinkError: "Email is required." });
        }

        const ip = getClientAddress();

        if (await isLoginThrottled({ ip, email, action: "magic_link" })) {
            return fail(429, { magicLinkError: THROTTLE_MESSAGE });
        }

        if (!isMailAvailable()) {
            return { magicLinkUnavailable: true };
        }

        const raw = await createMagicLoginToken(email);

        if (!raw) {
            await registerLoginAttempt({ ip, email, action: "magic_link", success: false });
            throw redirect(302, "/magic-link/sent?email=" + encodeURIComponent(email));
        }

        const origin = request.headers.get("origin") || "";
        const magicLink = `${origin}/magic-login/callback?token=${raw}`;

        try {
            const { subject, text } = renderEmail("magic-link", { link: magicLink });
            await sendMail({ to: email, subject, text });
            logger.info({ email }, "Magic login email sent");
            await registerLoginAttempt({ ip, email, action: "magic_link", success: true });
        } catch (err) {
            logger.error({ err, email }, "Failed to send magic login email");
            return fail(500, { magicLinkError: "Failed to send the email. Please try again later." });
        }

        throw redirect(302, "/magic-link/sent?email=" + encodeURIComponent(email));
    },
};
