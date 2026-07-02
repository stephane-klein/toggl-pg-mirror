import { json } from "@sveltejs/kit";
import { PUBLIC_BUILD_STAMP, PUBLIC_GIT_BRANCH, PUBLIC_GIT_DATE, PUBLIC_GIT_HASH } from "$env/static/public";

export function GET() {
    return json({
        environment: process.env.NODE_ENV || "development",
        branch: PUBLIC_GIT_BRANCH || "unknown",
        gitDate: PUBLIC_GIT_DATE || "unknown",
        buildStamp: PUBLIC_BUILD_STAMP || "unknown",
        gitHash: PUBLIC_GIT_HASH || "unknown",
    });
}
