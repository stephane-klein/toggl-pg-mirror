//#region node_modules/.pnpm/@sveltejs+kit@2.68.0_@sveltejs+vite-plugin-svelte@7.1.2_svelte@5.56.4_vite@8.1.1_jiti@2_232c113973797263c30dfc444d47d593/node_modules/@sveltejs/kit/src/runtime/app/paths/internal/server.js
var base = "";
var assets = base;
var app_dir = "_app";
var initial = {
	base,
	assets
};
/**
* @param {{ base: string, assets: string }} paths
*/
function override(paths) {
	base = paths.base;
	assets = paths.assets;
}
function reset() {
	base = initial.base;
	assets = initial.assets;
}

export { assets as a, base as b, app_dir as c, override as o, reset as r };
//# sourceMappingURL=internal2.js-CvdH--kv.js.map
