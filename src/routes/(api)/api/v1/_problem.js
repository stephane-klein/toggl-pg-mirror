import { json } from "@sveltejs/kit";

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
