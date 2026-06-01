//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	let { children } = $$props;
	children($$renderer);
	$$renderer.push(`<!----> <footer class="border-t border-gray-300"><div class="page px-5 py-3 text-xs text-gray-500 flex items-center justify-between"><a href="https://github.com/stephane-klein/toggl-pg-mirror" class="text-gray-500 no-underline hover:underline">GitHub</a> <a href="/-/version.json" class="text-gray-500 no-underline hover:underline">Version</a></div></footer>`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-CunHjWKa.js.map
