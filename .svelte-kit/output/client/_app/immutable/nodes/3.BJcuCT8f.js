import{E as e,L as t,M as n,N as r,T as i,b as a,d as o,p as s,u as c,w as l}from"../chunks/D88Bv3cQ.js";import"../chunks/xihTtKlq.js";var u=s(`<h1>Import CSV</h1> <p>Import a Toggl CSV export via HTTP POST:</p> <pre> </pre> Or with<a href="https://github.com/ducaale/xh">xh</a> and <a href="https://github.com/junegunn/fzf">fzf</a> to select
the file: <pre> </pre>`,1);function d(s,d){r(d,!0);var f=u(),p=e(i(f),4),m=l(p);t(p);var h=e(p,6),g=l(h);t(h),a(()=>{c(m,`
$ curl -X POST ${d.data.origin??``}/import-csv/upload/ -F "file=@Toggl_time_entries_2025-01-01_to_2025-12-31.csv"
`),c(g,`
$ xh -b --form POST ${d.data.origin??``}/import-csv/upload/ file@$(fzf)
`)}),o(s,f),n()}export{d as component};