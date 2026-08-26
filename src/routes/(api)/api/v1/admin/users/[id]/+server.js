import { json } from "@sveltejs/kit";
import { safeParse } from "valibot";
import { hashPassword } from "$lib/server/auth.js";
import { sql } from "$lib/server/pg.js";
import { userPatchSchema } from "$lib/schemas/user.js";
import { findDuplicateCategoryTag } from "$lib/schemas/activity-matrix.js";
import { requireAdminToken } from "../../_helpers.js";
import { problem } from "../../../_problem.js";

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
        SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
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

    const parsed = safeParse(userPatchSchema, body);
    if (!parsed.success) {
        return problem(422, parsed.issues[0].message, event.request.url);
    }
    const { email, display_name, password, oidc_issuer, oidc_subject, is_active, activity_matrix_categories } =
        parsed.output;
    const emailTrim = email?.trim();
    const displayNameTrim = display_name?.trim();
    const oidcIssuer = oidc_issuer?.replace(/\/$/, "").trim();
    const oidcSubject = oidc_subject?.trim();

    const duplicateTag = activity_matrix_categories && findDuplicateCategoryTag(activity_matrix_categories);
    if (duplicateTag) {
        return problem(422, `Duplicate category tag: ${duplicateTag}`, event.request.url);
    }

    if (emailTrim !== undefined) {
        const conflict = await sql`SELECT id FROM users WHERE email = ${emailTrim} AND id != ${event.params.id}`;
        if (conflict.length > 0) {
            return problem(409, "A user with this email already exists", event.request.url);
        }
    }

    if (oidcIssuer !== undefined || oidcSubject !== undefined) {
        if (oidcIssuer === undefined || oidcSubject === undefined) {
            return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
        }

        const conflict = await sql`
            SELECT id FROM users
            WHERE oidc_issuer = ${oidcIssuer} AND oidc_subject = ${oidcSubject}
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
    if (password) {
        passwordHash = await hashPassword(password);
    }

    const [user] = await sql`
        UPDATE users
        SET
            email         = COALESCE(${emailTrim || null}, email),
            display_name  = COALESCE(${displayNameTrim || null}, display_name),
            password_hash = CASE WHEN ${!!password} THEN ${passwordHash} ELSE password_hash END,
            oidc_issuer   = COALESCE(${oidcIssuer || null}, oidc_issuer),
            oidc_subject  = COALESCE(${oidcSubject || null}, oidc_subject),
            is_active     = COALESCE(${is_active !== undefined ? is_active : null}, is_active),
            activity_matrix_categories = COALESCE(${activity_matrix_categories ?? null}, activity_matrix_categories),
            updated_at    = ${now}
        WHERE id = ${event.params.id}
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
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
