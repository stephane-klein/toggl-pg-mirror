import { p as public_env } from '../../../../../chunks/shared-server.js-CCs2CV3b.js';
import { j as json } from '../../../../../chunks/utils.js-Z9qv_ujy.js';
import '../../../../../chunks/shared.js-CXWIPVHZ.js';
import '../../../../../chunks/uneval.js-CGAFo80M.js';

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

export { GET };
//# sourceMappingURL=_server.js-RSxXhq09.js.map
