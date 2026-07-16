import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

export function GET() {
    return json({
        environment: process.env.NODE_ENV || "development",
        branch: env.PUBLIC_GIT_BRANCH ?? null,
        gitDate: env.PUBLIC_GIT_DATE ?? null,
        buildStamp: env.PUBLIC_BUILD_STAMP ?? null,
        gitHash: env.PUBLIC_GIT_HASH ?? null,
    });
}
