<h1>Import CSV</h1>

<p>Import a Toggl CSV export via HTTP POST:</p>

<pre>
$ curl -X POST http://localhost:5173/import-csv/ -F "file=@Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
</pre>

Or with <a href="https://github.com/ducaale/xh">xh</a> and <a href="https://github.com/junegunn/fzf">fzf</a> to select the file:

<pre>
$ xh -b --form POST http://localhost:5173/import-csv/ file@$(fzf)
</pre>
