//#region src/routes/import-csv/+page.server.js
function load({ url }) {
	return { origin: url.origin };
}
//#endregion
export { load };
