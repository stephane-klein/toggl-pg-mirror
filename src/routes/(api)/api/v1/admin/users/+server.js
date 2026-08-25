import { json } from "@sveltejs/kit";
import { safeParse } from "valibot";
import { generateId, hashPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { userFieldsSchema } from "$lib/schemas/user.js";
import { findDuplicateCategoryTag } from "$lib/schemas/activity-matrix.js";
import { generateCursor, requireAdminToken } from "../_helpers.js";
import { problem } from "../../_problem.js";

export async function GET(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const cursorParam = event.url.searchParams.get("cursor");
    const pageSize = Math.min(parseInt(event.url.searchParams.get("page_size") || "20", 10), 100);

    const users = cursorParam
        ? await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
              FROM users
              WHERE (created_at, id) > (${JSON.parse(Buffer.from(cursorParam, "base64").toString()).created_at}, ${JSON.parse(Buffer.from(cursorParam, "base64").toString()).id})
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `
        : await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
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

    const parsed = safeParse(userFieldsSchema, body);
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }
    const { email, display_name, password, oidc_issuer, oidc_subject, activity_matrix_categories } = parsed.output;
    const emailTrim = email?.trim();
    const displayNameTrim = display_name?.trim();
    const oidcIssuer = oidc_issuer?.replace(/\/$/, "").trim();
    const oidcSubject = oidc_subject?.trim();

    const duplicateTag = activity_matrix_categories && findDuplicateCategoryTag(activity_matrix_categories);
    if (duplicateTag) {
        return problem(422, `Duplicate category tag: ${duplicateTag}`, event.request.url);
    }

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;

    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }

    if (!hasOidc) {
        if (!emailTrim) return problem(400, "email is required", event.request.url);
        if (!displayNameTrim) return problem(400, "display_name is required", event.request.url);
    }

    if (emailTrim) {
        const existing = await sql`SELECT id FROM users WHERE email = ${emailTrim}`;
        if (existing.length > 0) {
            return problem(409, "A user with this email already exists", event.request.url);
        }
    }

    if (hasOidc) {
        const existing = await sql`
            SELECT id FROM users WHERE oidc_issuer = ${oidcIssuer} AND oidc_subject = ${oidcSubject}
        `;
        if (existing.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const id = generateId();
    const passwordHash = password ? await hashPassword(password) : null;
    const displayName = displayNameTrim || null;

    const [user] = await sql`
        INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject, activity_matrix_categories)
        VALUES (${id}, ${emailTrim || null}, ${displayName}, ${passwordHash},
                ${oidcIssuer || null}, ${oidcSubject || null}, ${activity_matrix_categories ?? null})
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
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

    const parsed = safeParse(userFieldsSchema, body);
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }
    const {
        email: rawEmail,
        display_name,
        password,
        oidc_issuer,
        oidc_subject,
        activity_matrix_categories,
    } = parsed.output;
    const email = rawEmail?.trim();
    const displayName = display_name?.trim();
    const oidcIssuer = oidc_issuer?.replace(/\/$/, "").trim();
    const oidcSubject = oidc_subject?.trim();

    const duplicateTag = activity_matrix_categories && findDuplicateCategoryTag(activity_matrix_categories);
    if (duplicateTag) {
        return problem(422, `Duplicate category tag: ${duplicateTag}`, event.request.url);
    }

    if (!email) return problem(400, "email is required", event.request.url);
    if (!displayName) return problem(400, "display_name is required", event.request.url);

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;
    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }

    const [existing] =
        await sql`SELECT id, password_hash, activity_matrix_categories FROM users WHERE email = ${email}`;

    if (hasOidc) {
        const conflict = await sql`
            SELECT id FROM users
            WHERE oidc_issuer = ${oidcIssuer} AND oidc_subject = ${oidcSubject}
            AND email != ${email}
        `;
        if (conflict.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const now = new Date();

    let user;
    if (!existing) {
        const id = generateId();
        [user] = await sql`
            INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject, activity_matrix_categories)
            VALUES (${id}, ${email}, ${displayName}, ${passwordHash},
                    ${oidcIssuer || null}, ${oidcSubject || null}, ${activity_matrix_categories ?? null})
            RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
        `;
    } else {
        [user] = await sql`
            UPDATE users
            SET display_name  = ${displayName},
                password_hash = ${password ? passwordHash : existing.password_hash},
                oidc_issuer   = ${oidcIssuer || null},
                oidc_subject  = ${oidcSubject || null},
                activity_matrix_categories = ${activity_matrix_categories ?? existing.activity_matrix_categories},
                updated_at    = ${now}
            WHERE email = ${email}
            RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
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
