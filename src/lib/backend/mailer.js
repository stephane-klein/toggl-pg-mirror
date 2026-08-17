import nodemailer from "nodemailer";
import { logger } from "./logger.js";

const {
    SMTP_HOST = "",
    SMTP_PORT = "587",
    SMTP_USER = "",
    SMTP_PASS = "",
    SMTP_SECURE = "",
    EMAIL_FROM = "noreply@example.com",
} = process.env;

const transporter = SMTP_HOST
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: SMTP_SECURE === "true",
          auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;

if (transporter) {
    logger.info({ smtpHost: SMTP_HOST, smtpPort: SMTP_PORT, emailFrom: EMAIL_FROM }, "SMTP configured");
} else {
    logger.warn(
        "SMTP is not configured — set SMTP_HOST environment variable (e.g. SMTP_HOST=localhost with SMTP_PORT=1025 for Mailpit)",
    );
}

export function isMailAvailable() {
    return transporter !== null;
}

export async function verifySmtpConnection() {
    if (!transporter) {
        return false;
    }

    try {
        await transporter.verify();
        logger.info({ smtpHost: SMTP_HOST, smtpPort: SMTP_PORT }, "SMTP connection verified at startup");
        return true;
    } catch (err) {
        logger.error(
            { err, smtpHost: SMTP_HOST, smtpPort: SMTP_PORT },
            "SMTP connection failed at startup — email features (send-test-mail) will fail",
        );
        return false;
    }
}

export async function sendMail({ to, subject, text, html }) {
    if (!transporter) {
        throw new Error(
            "SMTP is not configured — set SMTP_HOST environment variable (e.g. SMTP_HOST=localhost with SMTP_PORT=1025 for Mailpit)",
        );
    }

    return transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
}
