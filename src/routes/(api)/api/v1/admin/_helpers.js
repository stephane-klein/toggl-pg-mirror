import { json } from "@sveltejs/kit";

const ADMIN_TOKEN = process.env.TOGGL_PG_MIRROR_ADMIN_TOKEN;

export function requireAdminToken(event) {
    if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 32) {
        return json(
            {
                type: "about:blank",
                title: "Configuration Error",
                status: 500,
                detail: "Admin token is not configured or must be at least 32 characters long",
                instance: event.request.url,
            },
            { status: 500 },
        );
    }

    const authHeader = event.request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== ADMIN_TOKEN) {
        return problem(401, "Admin token required", event.request.url);
    }

    return null;
}

export function problem(status, detail, instance) {
    const titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
    };

    return json(
        {
            type: "about:blank",
            title: titles[status] || "Error",
            status,
            detail,
            instance,
        },
        { status },
    );
}

export function generateCursor(user) {
    return Buffer.from(
        JSON.stringify({
            created_at: user.created_at,
            id: user.id,
        }),
    ).toString("base64");
}
