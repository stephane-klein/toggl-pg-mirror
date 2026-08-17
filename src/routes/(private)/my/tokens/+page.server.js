import { fail } from "@sveltejs/kit";
import { createApiToken, deleteApiToken, listUserApiTokens } from "$lib/backend/auth.js";

export async function load(event) {
    const tokens = await listUserApiTokens(event.locals.user.id);

    return { tokens };
}

export const actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const name = data.get("name");

        if (!name) {
            return fail(400, { error: "Token name is required." });
        }

        const token = await createApiToken(user.id, name);

        return { created: true, raw: token.raw, name: token.name };
    },

    delete: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const tokenId = data.get("id");

        if (!tokenId) {
            return fail(400, { error: "Token ID is required." });
        }

        await deleteApiToken(tokenId);

        return { deleted: true };
    },
};
