import { json } from "@sveltejs/kit";
import { safeParse } from "valibot";
import {
    getUserActivityMatrixCategories,
    setUserActivityMatrixCategories,
} from "$lib/backend/activity-matrix-store.js";
import { activityMatrixCategoriesSchema } from "$lib/schemas/activity-matrix.js";
import { problem } from "../../_problem.js";

function links() {
    return { self: { href: "/api/v1/me/activity-matrix-categories" } };
}

function requireUser(event) {
    if (!event.locals.user) {
        return problem(401, "Authentication required", event.request.url);
    }
    return null;
}

export async function GET(event) {
    const authError = requireUser(event);
    if (authError) return authError;

    const categories = await getUserActivityMatrixCategories(event.locals.user.id);

    return json({ data: categories, _links: links() });
}

export async function PUT(event) {
    const authError = requireUser(event);
    if (authError) return authError;

    const body = await event.request.json();

    const parsed = safeParse(activityMatrixCategoriesSchema, body);
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }
    const categories = parsed.output;

    const seenTags = new Set();
    for (const category of categories) {
        const normalizedTag = category.tag.toLowerCase();
        if (seenTags.has(normalizedTag)) {
            return problem(422, `Duplicate category tag: ${category.tag}`, event.request.url);
        }
        seenTags.add(normalizedTag);
    }

    await setUserActivityMatrixCategories(event.locals.user.id, categories);

    return json({
        data: await getUserActivityMatrixCategories(event.locals.user.id),
        _links: links(),
    });
}
