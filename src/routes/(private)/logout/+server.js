import { invalidateSession, SESSION_COOKIE_NAME } from "$lib/backend/auth.js";

export async function GET({ cookies }) {
    const sessionId = cookies.get(SESSION_COOKIE_NAME);

    if (sessionId) {
        await invalidateSession(sessionId);
    }

    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });

    return new Response(null, {
        status: 302,
        headers: { location: "/" },
    });
}
