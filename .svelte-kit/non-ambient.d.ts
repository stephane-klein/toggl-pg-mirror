
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/(infra)" | "/(app)" | "/" | "/(infra)/-" | "/(infra)/-/healthy" | "/(infra)/-/ready" | "/(infra)/-/version.json" | "/import-csv" | "/import-csv/upload" | "/(app)/time-entries";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/(infra)": Record<string, never>;
			"/(app)": Record<string, never>;
			"/": Record<string, never>;
			"/(infra)/-": Record<string, never>;
			"/(infra)/-/healthy": Record<string, never>;
			"/(infra)/-/ready": Record<string, never>;
			"/(infra)/-/version.json": Record<string, never>;
			"/import-csv": Record<string, never>;
			"/import-csv/upload": Record<string, never>;
			"/(app)/time-entries": Record<string, never>
		};
		Pathname(): "/" | "/-/healthy" | "/-/ready" | "/-/version.json" | "/import-csv/" | "/import-csv/upload/" | "/time-entries/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.ico" | string & {};
	}
}