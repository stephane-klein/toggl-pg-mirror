import { json } from "@sveltejs/kit";
//#region src/routes/(infra)/-/healthy/+server.js
function GET() {
	return json({ status: "ok" });
}
//#endregion
export { GET };
