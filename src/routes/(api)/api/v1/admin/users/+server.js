import { json } from "@sveltejs/kit";
import { generateId, hashPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { generateCursor, problem, requireAdminToken } from "../_helpers.js";

export async function GET(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const cursorParam = event.url.searchParams.get("cursor");
    const pageSize = Math.min(parseInt(event.url.searchParams.get("page_size") || "20", 10), 100);

    const users = cursorParam
        ? await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
              FROM users
              WHERE (created_at, id) > (${JSON.parse(Buffer.from(cursorParam, "base64").toString()).created_at}, ${JSON.parse(Buffer.from(cursorParam, "base64").toString()).id})
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `
        : await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
              FROM users
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `;

    const hasMore = users.length > pageSize;
    if (hasMore) users.pop();

    return json({
        data: users,
        next_cursor: hasMore ? generateCursor(users[users.length - 1]) : null,
        _links: {
            self: { href: "/api/v1/admin/users" },
        },
    });
}

export async function POST(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();
    const { email, display_name, password } = body;
    const oidc_issuer = body.oidc_issuer?.replace(/\/$/, "");
    const oidc_subject = body.oidc_subject;

    const hasOidc = oidc_issuer !== undefined || oidc_subject !== undefined;

    if ((oidc_issuer === undefined) !== (oidc_subject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }

    if (hasOidc) {
        if (email !== undefined && (typeof email !== "string" || !email.trim())) {
            return problem(400, "email must be a non-empty string", event.request.url);
        }
        if (display_name !== undefined && (typeof display_name !== "string" || !display_name.trim())) {
            return problem(400, "display_name must be a non-empty string", event.request.url);
        }
        if (password !== undefined && (typeof password !== "string" || password.length < 12)) {
            return problem(422, "password must be at least 12 characters", event.request.url);
        }
    } else {
        if (!email || typeof email !== "string" || !email.trim()) {
            return problem(400, "email is required", event.request.url);
        }
        if (!display_name || typeof display_name !== "string" || !display_name.trim()) {
            return problem(400, "display_name is required", event.request.url);
        }
        if (password !== undefined && (typeof password !== "string" || password.length < 12)) {
            return problem(422, "password must be at least 12 characters", event.request.url);
        }
    }

    if (email?.trim()) {
        const existing = await sql`SELECT id FROM users WHERE email = ${email.trim()}`;
        if (existing.length > 0) {
            return problem(409, "A user with this email already exists", event.request.url);
        }
    }

    if (hasOidc) {
        const existing = await sql`
            SELECT id FROM users WHERE oidc_issuer = ${oidc_issuer.trim()} AND oidc_subject = ${oidc_subject.trim()}
        `;
        if (existing.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const id = generateId();
    const passwordHash = password ? await hashPassword(password) : null;
    const displayName = display_name?.trim() || null;

    const [user] = await sql`
        INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject)
        VALUES (${id}, ${email?.trim() || null}, ${displayName}, ${passwordHash},
                ${oidc_issuer?.trim() || null}, ${oidc_subject?.trim() || null})
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
    `;

    return json(
        {
            data: user,
            _links: {
                self: { href: `/api/v1/admin/users/${user.id}` },
                collection: { href: "/api/v1/admin/users" },
            },
        },
        {
            status: 201,
            headers: { Location: `/api/v1/admin/users/${user.id}` },
        },
    );
}

export async function PUT(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();
    const email = body.email?.trim();
    const display_name = body.display_name;
    const password = body.password;
    const oidc_issuer = body.oidc_issuer?.replace(/\/$/, "");
    const oidc_subject = body.oidc_subject;

    if (!email || typeof email !== "string" || !email.trim()) {
        return problem(400, "email is required", event.request.url);
    }
    if (typeof display_name !== "string" || !display_name.trim()) {
        return problem(400, "display_name is required", event.request.url);
    }

    const hasOidc = oidc_issuer !== undefined || oidc_subject !== undefined;
    if ((oidc_issuer === undefined) !== (oidc_subject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }
    if (password !== undefined && (typeof password !== "string" || password.length < 12)) {
        return problem(422, "password must be at least 12 characters", event.request.url);
    }

    const [existing] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;

    if (hasOidc) {
        const conflict = await sql`
            SELECT id FROM users
            WHERE oidc_issuer = ${oidc_issuer.trim()} AND oidc_subject = ${oidc_subject.trim()}
            AND email != ${email}
        `;
        if (conflict.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const displayName = display_name.trim();
    const passwordHash = password ? await hashPassword(password) : null;
    const now = new Date();

    let user;
    if (!existing) {
        const id = generateId();
        [user] = await sql`
            INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject)
            VALUES (${id}, ${email}, ${displayName}, ${passwordHash},
                    ${oidc_issuer?.trim() || null}, ${oidc_subject?.trim() || null})
            RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
        `;
    } else {
        [user] = await sql`
            UPDATE users
            SET display_name  = ${displayName},
                password_hash = ${password ? passwordHash : existing.password_hash},
                oidc_issuer   = ${oidc_issuer?.trim() || null},
                oidc_subject  = ${oidc_subject?.trim() || null},
                updated_at    = ${now}
            WHERE email = ${email}
            RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
        `;
    }

    return json({
        data: user,
        _links: {
            self: { href: `/api/v1/admin/users/${user.id}` },
            collection: { href: "/api/v1/admin/users" },
        },
    });
}
