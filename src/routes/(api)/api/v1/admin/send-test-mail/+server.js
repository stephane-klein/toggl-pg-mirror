import { json } from "@sveltejs/kit";
import { email, pipe, safeParse, string } from "valibot";
import { requireAdminToken } from "../_helpers.js";
import { problem } from "../../_problem.js";
import { sendMail } from "$lib/backend/mailer.js";
import { logger } from "$lib/backend/logger.js";

const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;
const SUBJECT = "Test email from toggl-pg-mirror";
const TEXT = "This is a test email sent from toggl-pg-mirror.";

export async function POST(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json().catch(() => ({}));
    const to = body.to || TEST_EMAIL_TO;

    if (!safeParse(pipe(string(), email()), to).success) {
        return problem(
            400,
            "A valid 'to' email address is required — set TEST_EMAIL_TO env or provide 'to' in the request body",
            event.request.url,
        );
    }

    try {
        const info = await sendMail({ to, subject: SUBJECT, text: TEXT });
        logger.info({ messageId: info.messageId, to, subject: SUBJECT }, "Test email sent");
        return json({
            data: { messageId: info.messageId, to, subject: SUBJECT },
            _links: { self: { href: "/api/v1/admin/send-test-mail" } },
        });
    } catch (err) {
        logger.error({ err, to }, "Failed to send test email");
        return problem(500, `Failed to send email: ${err.message}`, event.request.url);
    }
}
