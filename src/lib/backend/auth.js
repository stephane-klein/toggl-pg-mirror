import { hash, verify } from "@node-rs/argon2";
import { nanoid } from "nanoid";
import { sql } from "./pg.js";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(password) {
    return await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
}

export async function verifyPassword(hash, password) {
    return await verify(hash, password);
}

export function generateId() {
    return nanoid();
}

function now() {
    return new Date();
}

export async function createSession(userId, expiresInMs = SESSION_EXPIRES_IN_MS) {
    const id = generateId();
    const expiresAt = new Date(now().getTime() + expiresInMs);

    await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;

    return { id, userId, expiresAt };
}

export async function validateSession(sessionId) {
    const [session] = await sql`
        SELECT s.id, s.user_id, s.expires_at, u.is_active
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.id = ${sessionId}
    `;

    if (!session) return null;

    const nowMs = now().getTime();

    if (nowMs >= session.expires_at.getTime()) {
        await sql`DELETE FROM sessions WHERE id = ${session.id}`;
        return null;
    }

    if (!session.is_active) {
        await sql`DELETE FROM sessions WHERE id = ${session.id}`;
        return null;
    }

    if (nowMs >= session.expires_at.getTime() - SESSION_EXPIRES_IN_MS / 2) {
        const newExpiresAt = new Date(nowMs + SESSION_EXPIRES_IN_MS);
        await sql`UPDATE sessions SET expires_at = ${newExpiresAt} WHERE id = ${session.id}`;
        session.expiresAt = newExpiresAt;
    }

    return session;
}

export async function invalidateSession(sessionId) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function invalidateAllUserSessions(userId) {
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createApiToken(userId, name, expiresInDays = null) {
    const id = generateId();
    const raw = nanoid(48);

    // prettier-ignore
    await sql`
        INSERT INTO api_tokens (id, user_id, name, token_hash, expires_at)
        VALUES (
            ${id},                   -- id
            ${userId},               -- user_id
            ${name},                 -- name
            ${await hashToken(raw)}, -- token_hash
            ${
                expiresInDays
                    ? new Date(now().getTime() + expiresInDays * 24 * 3600 * 1000)
                    : null
            }                        -- expires_at
        )
    `;

    return { id, name, raw };
}

export async function validateApiToken(raw) {
    const tokenHash = await hashToken(raw);

    const [token] = await sql`
        SELECT t.id, t.user_id, t.expires_at, u.is_active
        FROM api_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ${tokenHash}
    `;

    if (!token) return null;
    if (!token.is_active) return null;
    if (token.expires_at && now().getTime() >= token.expires_at.getTime()) return { expired: true };

    await sql`UPDATE api_tokens SET last_used = ${now()} WHERE id = ${token.id}`;

    return token;
}

export async function deleteApiToken(tokenId) {
    await sql`DELETE FROM api_tokens WHERE id = ${tokenId}`;
}

export async function listUserApiTokens(userId) {
    return await sql`SELECT id, name, last_used, created_at, expires_at FROM api_tokens WHERE user_id = ${userId}`;
}

export async function createPasswordResetToken(email) {
    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (!user) return null;

    const raw = nanoid(48);
    const tokenHash = await hashToken(raw);
    const expiresAt = new Date(now().getTime() + 1000 * 60 * 30);

    await sql`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
              VALUES (${generateId()}, ${user.id}, ${tokenHash}, ${expiresAt})`;

    return raw;
}

export async function validatePasswordResetToken(raw) {
    const tokenHash = await hashToken(raw);

    const [token] = await sql`
        SELECT t.id, t.user_id, t.expires_at, u.email
        FROM password_reset_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ${tokenHash}
          AND t.used = FALSE
          AND t.expires_at > ${now()}
    `;

    if (!token) return null;

    return token;
}

export async function usePasswordResetToken(tokenId, userId, newPasswordHash) {
    await sql`UPDATE users SET password_hash = ${newPasswordHash}, updated_at = ${now()} WHERE id = ${userId}`;
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${tokenId}`;
    await invalidateAllUserSessions(userId);
}

export async function createMagicLoginToken(email) {
    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (!user) return null;

    const raw = nanoid(48);
    const tokenHash = await hashToken(raw);
    const expiresAt = new Date(now().getTime() + 1000 * 60 * 15);

    await sql`INSERT INTO magic_link_tokens (id, user_id, token_hash, expires_at)
              VALUES (${generateId()}, ${user.id}, ${tokenHash}, ${expiresAt})`;

    return raw;
}

export async function validateMagicLoginToken(raw) {
    const tokenHash = await hashToken(raw);

    const [token] = await sql`
        SELECT t.id, t.user_id
        FROM magic_link_tokens t
        WHERE t.token_hash = ${tokenHash}
          AND t.used = FALSE
          AND t.expires_at > ${now()}
    `;

    if (!token) return null;

    await sql`UPDATE magic_link_tokens SET used = TRUE WHERE id = ${token.id}`;

    return { userId: token.user_id };
}
