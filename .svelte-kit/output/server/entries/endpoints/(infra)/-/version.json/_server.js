import { t as public_env } from "../../../../../chunks/shared-server.js";
import { json } from "@sveltejs/kit";
//#region src/routes/(infra)/-/version.json/+server.js
function GET() {
	return json({
		environment: process.env.NODE_ENV || "development",
		branch: public_env.PUBLIC_GIT_BRANCH ?? null,
		gitDate: public_env.PUBLIC_GIT_DATE ?? null,
		buildStamp: public_env.PUBLIC_BUILD_STAMP ?? null,
		gitHash: public_env.PUBLIC_GIT_HASH ?? null
	});
}
//#endregion
export { GET };
