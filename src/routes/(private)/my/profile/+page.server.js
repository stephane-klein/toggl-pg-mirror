import { fail } from "@sveltejs/kit";
import { safeParse } from "valibot";
import { sql } from "$lib/backend/pg.js";
import {
    getUserActivityMatrixCategories,
    setUserActivityMatrixCategories,
} from "$lib/backend/activity-matrix-store.js";
import { activityMatrixCategoriesSchema } from "$lib/schemas/activity-matrix.js";

export async function load(event) {
    const categories = await getUserActivityMatrixCategories(event.locals.user.id);

    return {
        user: event.locals.user,
        categories,
    };
}

// Single default action shared by both forms on the page (SvelteKit forbids
// mixing the default action with named actions). A hidden `form` field tells
// which form was submitted.
export const actions = {
    default: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();

        if (data.get("form") === "activity-matrix") {
            return saveActivityMatrix(user, data);
        }

        return updateProfile(user, data);
    },
};

async function updateProfile(user, data) {
    const displayName = data.get("display-name");
    const email = data.get("email");

    if (!email) {
        return fail(400, { error: "Email is required." });
    }

    await sql`UPDATE users SET display_name = ${displayName || email}, email = ${email}, updated_at = ${new Date()} WHERE id = ${user.id}`;

    return { saved: true };
}

async function saveActivityMatrix(user, data) {
    const labels = data.getAll("label");
    const tags = data.getAll("tag");
    const colors = data.getAll("color");

    if (labels.length !== tags.length || tags.length !== colors.length) {
        return fail(400, { matrixError: "Malformed category fields." });
    }

    const categories = labels.map((label, index) => ({
        label: String(label).trim(),
        tag: String(tags[index]).trim().replace(/#/g, ""),
        color: String(colors[index]).trim(),
    }));

    const parsed = safeParse(activityMatrixCategoriesSchema, categories);
    if (!parsed.success) {
        return fail(400, { matrixError: parsed.issues[0].message });
    }

    const seenTags = new Set();
    for (const category of parsed.output) {
        const normalizedTag = category.tag.toLowerCase();
        if (seenTags.has(normalizedTag)) {
            return fail(400, { matrixError: `Duplicate category tag: ${category.tag}` });
        }
        seenTags.add(normalizedTag);
    }

    await setUserActivityMatrixCategories(user.id, parsed.output);

    return { matrixSaved: true };
}
