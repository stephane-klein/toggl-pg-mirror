import { sql } from "./pg.js";

export const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5", 10);
export const LOGIN_WINDOW_MS = parseInt(process.env.LOGIN_WINDOW_MS || String(15 * 60 * 1000), 10);

export async function registerLoginAttempt({ ip, email, action, success }) {
    await sql`
        INSERT INTO login_attempts (ip, email, action, success)
        VALUES (${ip}, ${email}, ${action}, ${success})
    `;
}

export async function getFailedCount({ ip, email, action }) {
    const since = new Date(Date.now() - LOGIN_WINDOW_MS);
    const [row] = await sql`
        SELECT
            COUNT(*) FILTER (WHERE ip = ${ip} AND NOT success)::int AS by_ip,
            COUNT(*) FILTER (WHERE email = ${email} AND NOT success)::int AS by_email
        FROM login_attempts
        WHERE action = ${action}
          AND attempted_at >= ${since}
    `;
    return { byIp: row.by_ip, byEmail: row.by_email };
}

export async function isLoginThrottled({ ip, email, action }) {
    const { byIp, byEmail } = await getFailedCount({ ip, email, action });
    return byIp >= LOGIN_MAX_ATTEMPTS || byEmail >= LOGIN_MAX_ATTEMPTS;
}

export async function clearLoginAttempts({ ip, email }) {
    await sql`
        DELETE FROM login_attempts
        WHERE ip = ${ip} OR email = ${email}
    `;
}
