import { json } from "@sveltejs/kit";
import { safeParse } from "valibot";
import { generateId, hashPassword } from "$lib/server/auth.js";
import { sql } from "$lib/server/pg.js";
import { userFieldsSchema } from "$lib/schemas/user.js";
import { findDuplicateCategoryTag } from "$lib/schemas/activity-matrix.js";
import { requireAdminToken } from "../../_helpers.js";
import { problem } from "../../../_problem.js";

const MAX_BATCH_SIZE = 1000;

class SyncError extends Error {
    constructor(status, detail) {
        super(detail);
        this.status = status;
        this.detail = detail;
    }
}

function validateUpsertItem(item) {
    const fields = safeParse(userFieldsSchema, item);
    if (!fields.success) {
        throw new SyncError(400, fields.issues[0].message);
    }
    const {
        email: rawEmail,
        display_name,
        password,
        oidc_issuer,
        oidc_subject,
        activity_matrix_categories,
    } = fields.output;
    const email = rawEmail?.trim();
    const displayName = display_name?.trim();
    const oidcIssuer = oidc_issuer?.replace(/\/$/, "").trim();
    const oidcSubject = oidc_subject?.trim();

    if (!email) throw new SyncError(400, "each upsert item must have a non-empty email");
    if (!displayName) throw new SyncError(400, "each upsert item must have a non-empty display_name");

    const duplicateTag = activity_matrix_categories && findDuplicateCategoryTag(activity_matrix_categories);
    if (duplicateTag) {
        throw new SyncError(422, `Duplicate category tag: ${duplicateTag}`);
    }

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;
    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        throw new SyncError(422, "Both oidc_issuer and oidc_subject must be provided together");
    }

    return {
        email,
        displayName,
        password,
        oidcIssuer: oidcIssuer || null,
        oidcSubject: oidcSubject || null,
        activityMatrixCategories: activity_matrix_categories ?? null,
        hasOidc,
    };
}

export async function PUT(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();
    const upsert = Array.isArray(body.upsert) ? body.upsert : [];
    const deleteTargets = Array.isArray(body.delete) ? body.delete : [];

    if (upsert.length + deleteTargets.length === 0) {
        return problem(400, "upsert or delete must contain at least one item", event.request.url);
    }
    if (upsert.length + deleteTargets.length > MAX_BATCH_SIZE) {
        return problem(422, `batch size must not exceed ${MAX_BATCH_SIZE} items`, event.request.url);
    }

    const upsertItems = [];
    const deleteEmails = [];
    const seenUpsert = new Set();
    const seenDelete = new Set();

    for (const item of upsert) {
        if (typeof item !== "object" || item === null) {
            return problem(422, "each upsert item must be an object", event.request.url);
        }
        const validated = validateUpsertItem(item);
        if (seenUpsert.has(validated.email)) {
            return problem(422, `duplicate email in upsert: ${validated.email}`, event.request.url);
        }
        seenUpsert.add(validated.email);
        upsertItems.push(validated);
    }

    for (const item of deleteTargets) {
        const email = item?.email?.trim();
        if (!email) {
            return problem(422, "each delete item must be an object with a non-empty email", event.request.url);
        }
        if (seenDelete.has(email)) {
            return problem(422, `duplicate email in delete: ${email}`, event.request.url);
        }
        seenDelete.add(email);
        deleteEmails.push(email);
    }

    for (const email of deleteEmails) {
        if (seenUpsert.has(email)) {
            return problem(422, `email present in both upsert and delete: ${email}`, event.request.url);
        }
    }

    const passwordHashes = await Promise.all(
        upsertItems.map((item) => (item.password ? hashPassword(item.password) : Promise.resolve(null))),
    );
    upsertItems.forEach((item, index) => (item.passwordHash = passwordHashes[index]));

    const now = new Date();

    try {
        const { created, updated, deleted, users } = await sql.begin(async (tx) => {
            const emails = [...seenUpsert, ...deleteEmails];
            const existingRows = await tx`
                SELECT id, email, password_hash, activity_matrix_categories FROM users WHERE email IN ${tx(emails)}
            `;
            const existingByEmail = new Map(existingRows.map((row) => [row.email, row]));

            for (const item of upsertItems) {
                if (!item.hasOidc) continue;

                const conflict = await tx`
                    SELECT email FROM users
                    WHERE oidc_issuer = ${item.oidcIssuer} AND oidc_subject = ${item.oidcSubject}
                    AND email != ${item.email}
                `;
                if (conflict.length > 0) {
                    throw new SyncError(409, `A user with this OIDC pair already exists: ${item.email}`);
                }
            }

            let created = 0;
            let updated = 0;
            let deleted = 0;

            for (const item of upsertItems) {
                const existing = existingByEmail.get(item.email);
                if (!existing) {
                    await tx`
                        INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject, activity_matrix_categories)
                        VALUES (${generateId()}, ${item.email}, ${item.displayName}, ${item.passwordHash},
                                ${item.oidcIssuer}, ${item.oidcSubject}, ${item.activityMatrixCategories})
                    `;
                    created += 1;
                } else {
                    await tx`
                        UPDATE users
                        SET display_name  = ${item.displayName},
                            password_hash = ${item.password ? item.passwordHash : existing.password_hash},
                            oidc_issuer   = ${item.oidcIssuer},
                            oidc_subject  = ${item.oidcSubject},
                            activity_matrix_categories = ${item.activityMatrixCategories ?? existing.activity_matrix_categories},
                            updated_at    = ${now}
                        WHERE email = ${item.email}
                    `;
                    updated += 1;
                }
            }

            for (const email of deleteEmails) {
                if (existingByEmail.has(email)) {
                    await tx`DELETE FROM users WHERE email = ${email}`;
                    deleted += 1;
                }
            }

            const users = await tx`
                SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, activity_matrix_categories, created_at, updated_at
                FROM users ORDER BY created_at, id
            `;

            return { created, updated, deleted, users };
        });

        return json({
            data: { created, updated, deleted, users },
            _links: {
                self: { href: "/api/v1/admin/users/sync" },
                collection: { href: "/api/v1/admin/users" },
            },
        });
    } catch (err) {
        if (err instanceof SyncError) {
            return problem(err.status, err.detail, event.request.url);
        }
        throw err;
    }
}
