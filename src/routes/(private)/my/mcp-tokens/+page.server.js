import { fail } from "@sveltejs/kit";
import { createMcpToken, deleteMcpToken, listUserMcpTokens } from "$lib/backend/auth.js";

export async function load(event) {
    const tokens = await listUserMcpTokens(event.locals.user.id);

    return { tokens };
}

export const actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const name = data.get("name");
        const expiresInDaysRaw = data.get("expiresInDays");

        if (!name) {
            return fail(400, { error: "Token name is required." });
        }

        if (expiresInDaysRaw && (!Number.isInteger(Number(expiresInDaysRaw)) || Number(expiresInDaysRaw) <= 0)) {
            return fail(400, { error: "Expiration must be a positive number of days." });
        }

        const expiresInDays = expiresInDaysRaw ? Number(expiresInDaysRaw) : null;
        const token = await createMcpToken(user.id, name, expiresInDays);

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

        await deleteMcpToken(user.id, tokenId);

        return { deleted: true };
    },
};
