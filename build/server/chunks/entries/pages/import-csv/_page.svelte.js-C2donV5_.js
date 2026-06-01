import { U as escape_html } from '../../../chunks/server.js-C_SwUxSJ.js';
import '../../../chunks/uneval.js-CGAFo80M.js';

//#region src/routes/import-csv/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { data } = $$props;
		$$renderer.push(`<h1>Import CSV</h1> <p>Import a Toggl CSV export via HTTP POST:</p> <pre>
$ curl -X POST ${escape_html(data.origin)}/import-csv/upload/ -F "file=@Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
</pre> Or with<a href="https://github.com/ducaale/xh">xh</a> and <a href="https://github.com/junegunn/fzf">fzf</a> to select
the file: <pre>
$ xh -b --form POST ${escape_html(data.origin)}/import-csv/upload/ file@$(fzf)
</pre>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-C2donV5_.js.map
