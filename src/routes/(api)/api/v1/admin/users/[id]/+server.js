import { json } from "@sveltejs/kit";
import { hashPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { problem, requireAdminToken } from "../../_helpers.js";

function userLinks(id) {
    return {
        self: { href: `/api/v1/admin/users/${id}` },
        collection: { href: "/api/v1/admin/users" },
    };
}

export async function GET(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const [user] = await sql`
        SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
        FROM users WHERE id = ${event.params.id}
    `;

    if (!user) return problem(404, "User not found", event.request.url);

    return json({
        data: user,
        _links: userLinks(user.id),
    });
}

export async function PATCH(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const [existing] = await sql`SELECT id FROM users WHERE id = ${event.params.id}`;
    if (!existing) return problem(404, "User not found", event.request.url);

    const body = await event.request.json();

    if (body.email !== undefined) {
        if (typeof body.email !== "string" || !body.email.trim()) {
            return problem(422, "email must be a non-empty string", event.request.url);
        }

        const conflict =
            await sql`SELECT id FROM users WHERE email = ${body.email.trim()} AND id != ${event.params.id}`;
        if (conflict.length > 0) {
            return problem(409, "A user with this email already exists", event.request.url);
        }
    }

    if (body.display_name !== undefined && (typeof body.display_name !== "string" || !body.display_name.trim())) {
        return problem(422, "display_name must be a non-empty string", event.request.url);
    }

    if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 12)) {
        return problem(422, "password must be at least 12 characters", event.request.url);
    }

    if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
        return problem(422, "is_active must be a boolean", event.request.url);
    }

    if (body.oidc_issuer !== undefined || body.oidc_subject !== undefined) {
        if (body.oidc_issuer === undefined || body.oidc_subject === undefined) {
            return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
        }

        const oidcIssuer = body.oidc_issuer.replace(/\/$/, "");
        const conflict = await sql`
            SELECT id FROM users
            WHERE oidc_issuer = ${oidcIssuer.trim()} AND oidc_subject = ${body.oidc_subject.trim()}
            AND id != ${event.params.id}
        `;
        if (conflict.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    if (Object.keys(body).length === 0) {
        return problem(400, "No fields to update", event.request.url);
    }

    const now = new Date();

    let passwordHash = null;
    if (body.password) {
        passwordHash = await hashPassword(body.password);
    }

    const [user] = await sql`
        UPDATE users
        SET
            email         = COALESCE(${body.email?.trim() || null}, email),
            display_name  = COALESCE(${body.display_name?.trim() || null}, display_name),
            password_hash = CASE WHEN ${!!body.password} THEN ${passwordHash} ELSE password_hash END,
            oidc_issuer   = COALESCE(${body.oidc_issuer?.replace(/\/$/, "").trim() || null}, oidc_issuer),
            oidc_subject  = COALESCE(${body.oidc_subject?.trim() || null}, oidc_subject),
            is_active     = COALESCE(${body.is_active !== undefined ? body.is_active : null}, is_active),
            updated_at    = ${now}
        WHERE id = ${event.params.id}
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
    `;

    return json({
        data: user,
        _links: userLinks(user.id),
    });
}

export async function DELETE(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const [existing] = await sql`SELECT id FROM users WHERE id = ${event.params.id}`;
    if (!existing) return problem(404, "User not found", event.request.url);

    await sql`DELETE FROM users WHERE id = ${event.params.id}`;

    return new Response(null, { status: 204 });
}
