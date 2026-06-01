const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.ico"]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DiQix60a.js",app:"_app/immutable/entry/app.CIG1gYfU.js",imports:["_app/immutable/entry/start.DiQix60a.js","_app/immutable/chunks/CJXk672G.js","_app/immutable/chunks/D88Bv3cQ.js","_app/immutable/entry/app.CIG1gYfU.js","_app/immutable/chunks/D88Bv3cQ.js","_app/immutable/chunks/DYl5dUZ5.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-BKGbBExl.js')),
			__memo(() => import('./nodes/1.js-B2ZjpFQK.js')),
			__memo(() => import('./nodes/2.js-DcfH1lTC.js')),
			__memo(() => import('./nodes/3.js-BVMXTtwW.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/(infra)/-/healthy",
				pattern: /^\/-\/healthy\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/(infra)/-/healthy/_server.js-CMvnDq8-.js'))
			},
			{
				id: "/(infra)/-/ready",
				pattern: /^\/-\/ready\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/(infra)/-/ready/_server.js-CU4AIwJ-.js'))
			},
			{
				id: "/(infra)/-/version.json",
				pattern: /^\/-\/version\.json\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/(infra)/-/version.json/_server.js-RSxXhq09.js'))
			},
			{
				id: "/import-csv",
				pattern: /^\/import-csv\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/import-csv/upload",
				pattern: /^\/import-csv\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/import-csv/upload/_server.js-Bh074trW.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-CLArPhfS.js.map
