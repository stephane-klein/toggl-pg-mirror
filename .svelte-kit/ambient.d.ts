
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const SHELL: string;
	export const LSCOLORS: string;
	export const npm_command: string;
	export const COLORTERM: string;
	export const CHEZMOI_VERSION_BUILT_BY: string;
	export const LESS: string;
	export const CHEZMOI_OS_RELEASE_CPE_NAME: string;
	export const HISTCONTROL: string;
	export const TERM_PROGRAM_VERSION: string;
	export const PROJECT_NAME: string;
	export const TMUX: string;
	export const HOSTNAME: string;
	export const HISTSIZE: string;
	export const CHEZMOI_OS_RELEASE_RELEASE_TYPE: string;
	export const NODE: string;
	export const CHEZMOI_COMMAND: string;
	export const CHEZMOI_OS_RELEASE_ANSI_COLOR: string;
	export const CHEZMOI_OS_RELEASE_VERSION: string;
	export const SSH_AUTH_SOCK: string;
	export const CHEZMOI: string;
	export const PEBBLE: string;
	export const CHEZMOI_OS_RELEASE_REDHAT_SUPPORT_PRODUCT_VERSION: string;
	export const CHEZMOI_CACHE_DIR: string;
	export const CHEZMOI_WORKING_TREE: string;
	export const COMPOSE_PROJECT_NAME: string;
	export const CHEZMOI_VERSION_VERSION: string;
	export const GNUPGHOME: string;
	export const CHEZMOI_KERNEL_OSTYPE: string;
	export const CHEZMOI_FQDN_HOSTNAME: string;
	export const GPG_TTY: string;
	export const EDITOR: string;
	export const GOBIN: string;
	export const CHEZMOI_GID: string;
	export const PWD: string;
	export const LOGNAME: string;
	export const ATUIN_SHLVL: string;
	export const CHEZMOI_VERSION_COMMIT: string;
	export const CHEZMOI_OS_RELEASE_VARIANT: string;
	export const CHEZMOI_ARGS: string;
	export const CHEZMOI_EXECUTABLE: string;
	export const TOGGL_PG_MIRROR_POSTGRES_URL: string;
	export const CHEZMOI_VERSION_DATE: string;
	export const MOTD_SHOWN: string;
	export const ATUIN_TMUX_POPUP: string;
	export const HOME: string;
	export const LANG: string;
	export const CHEZMOI_OS_RELEASE_BUG_REPORT_URL: string;
	export const LS_COLORS: string;
	export const CHEZMOI_USERNAME: string;
	export const STARSHIP_SHELL: string;
	export const __MISE_DIFF: string;
	export const CHEZMOI_OS_RELEASE_LOGO: string;
	export const SSH_ORIGINAL_COMMAND: string;
	export const CHEZMOI_OS_RELEASE_NAME: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const CHEZMOI_SUBSHELL: string;
	export const SSH_CONNECTION: string;
	export const GOROOT: string;
	export const INIT_CWD: string;
	export const CHEZMOI_HOME_DIR: string;
	export const STARSHIP_SESSION_KEY: string;
	export const __MISE_ORIG_PATH: string;
	export const npm_lifecycle_script: string;
	export const npm_package_bin_toggl_pg_mirror: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const ZSH: string;
	export const __MISE_ZSH_PRECMD_RUN: string;
	export const CONTAINER_HOST: string;
	export const CHEZMOI_OS_RELEASE_DOCUMENTATION_URL: string;
	export const LESSOPEN: string;
	export const USER: string;
	export const TMUX_PANE: string;
	export const __MISE_SESSION: string;
	export const CHEZMOI_UID: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const PAGER: string;
	export const CHEZMOI_OS_RELEASE_REDHAT_SUPPORT_PRODUCT: string;
	export const CHEZMOI_OS_RELEASE_VARIANT_ID: string;
	export const CHEZMOI_OS_RELEASE_ID: string;
	export const CHEZMOI_KERNEL_VERSION: string;
	export const CHEZMOI_OS_RELEASE_PRETTY_NAME: string;
	export const ATUIN_SESSION: string;
	export const npm_config_user_agent: string;
	export const CHEZMOI_COMMAND_DIR: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_execpath: string;
	export const CHEZMOI_OS_RELEASE_VERSION_ID: string;
	export const ATUIN_HISTORY_ID: string;
	export const CHEZMOI_GROUP: string;
	export const XDG_RUNTIME_DIR: string;
	export const CHEZMOI_CONFIG_FILE: string;
	export const CHEZMOI_OS_RELEASE_REDHAT_BUGZILLA_PRODUCT_VERSION: string;
	export const CHEZMOI_KERNEL_OSRELEASE: string;
	export const NODE_PATH: string;
	export const SSH_CLIENT: string;
	export const DEBUGINFOD_URLS: string;
	export const CHEZMOI_ARCH: string;
	export const DOCKER_HOST: string;
	export const npm_package_json: string;
	export const DEBUGINFOD_IMA_CERT_PATH: string;
	export const SKLEIN_DEVBOX_NAME: string;
	export const SKLEIN_DEVBOX_GOPASS: string;
	export const CHEZMOI_OS_RELEASE_DEFAULT_HOSTNAME: string;
	export const CHEZMOI_HOSTNAME: string;
	export const CHEZMOI_OS_RELEASE_SUPPORT_URL: string;
	export const MISE_SHELL: string;
	export const CHEZMOI_OS_RELEASE_HOME_URL: string;
	export const PATH: string;
	export const CHEZMOI_OS_RELEASE_SUPPORT_END: string;
	export const npm_config_node_gyp: string;
	export const INSTANCE_ID: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const CHEZMOI_OS_RELEASE_VERSION_CODENAME: string;
	export const MAIL: string;
	export const SSH_TTY: string;
	export const CHEZMOI_OS: string;
	export const CHEZMOI_SOURCE_DIR: string;
	export const PULSE_SERVER: string;
	export const __MISE_ZSH_CHPWD_RAN: string;
	export const npm_node_execpath: string;
	export const CHEZMOI_OS_RELEASE_REDHAT_BUGZILLA_PRODUCT: string;
	export const OLDPWD: string;
	export const CHEZMOI_DEST_DIR: string;
	export const TERM_PROGRAM: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	export const PUBLIC_GIT_DATE: string;
	export const PUBLIC_GIT_BRANCH: string;
	export const PUBLIC_BUILD_STAMP: string;
	export const PUBLIC_GIT_HASH: string;
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		SHELL: string;
		LSCOLORS: string;
		npm_command: string;
		COLORTERM: string;
		CHEZMOI_VERSION_BUILT_BY: string;
		LESS: string;
		CHEZMOI_OS_RELEASE_CPE_NAME: string;
		HISTCONTROL: string;
		TERM_PROGRAM_VERSION: string;
		PROJECT_NAME: string;
		TMUX: string;
		HOSTNAME: string;
		HISTSIZE: string;
		CHEZMOI_OS_RELEASE_RELEASE_TYPE: string;
		NODE: string;
		CHEZMOI_COMMAND: string;
		CHEZMOI_OS_RELEASE_ANSI_COLOR: string;
		CHEZMOI_OS_RELEASE_VERSION: string;
		SSH_AUTH_SOCK: string;
		CHEZMOI: string;
		PEBBLE: string;
		CHEZMOI_OS_RELEASE_REDHAT_SUPPORT_PRODUCT_VERSION: string;
		CHEZMOI_CACHE_DIR: string;
		CHEZMOI_WORKING_TREE: string;
		COMPOSE_PROJECT_NAME: string;
		CHEZMOI_VERSION_VERSION: string;
		GNUPGHOME: string;
		CHEZMOI_KERNEL_OSTYPE: string;
		CHEZMOI_FQDN_HOSTNAME: string;
		GPG_TTY: string;
		EDITOR: string;
		GOBIN: string;
		CHEZMOI_GID: string;
		PWD: string;
		LOGNAME: string;
		ATUIN_SHLVL: string;
		CHEZMOI_VERSION_COMMIT: string;
		CHEZMOI_OS_RELEASE_VARIANT: string;
		CHEZMOI_ARGS: string;
		CHEZMOI_EXECUTABLE: string;
		TOGGL_PG_MIRROR_POSTGRES_URL: string;
		CHEZMOI_VERSION_DATE: string;
		MOTD_SHOWN: string;
		ATUIN_TMUX_POPUP: string;
		HOME: string;
		LANG: string;
		CHEZMOI_OS_RELEASE_BUG_REPORT_URL: string;
		LS_COLORS: string;
		CHEZMOI_USERNAME: string;
		STARSHIP_SHELL: string;
		__MISE_DIFF: string;
		CHEZMOI_OS_RELEASE_LOGO: string;
		SSH_ORIGINAL_COMMAND: string;
		CHEZMOI_OS_RELEASE_NAME: string;
		pnpm_config_verify_deps_before_run: string;
		CHEZMOI_SUBSHELL: string;
		SSH_CONNECTION: string;
		GOROOT: string;
		INIT_CWD: string;
		CHEZMOI_HOME_DIR: string;
		STARSHIP_SESSION_KEY: string;
		__MISE_ORIG_PATH: string;
		npm_lifecycle_script: string;
		npm_package_bin_toggl_pg_mirror: string;
		TERM: string;
		npm_package_name: string;
		ZSH: string;
		__MISE_ZSH_PRECMD_RUN: string;
		CONTAINER_HOST: string;
		CHEZMOI_OS_RELEASE_DOCUMENTATION_URL: string;
		LESSOPEN: string;
		USER: string;
		TMUX_PANE: string;
		__MISE_SESSION: string;
		CHEZMOI_UID: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		PAGER: string;
		CHEZMOI_OS_RELEASE_REDHAT_SUPPORT_PRODUCT: string;
		CHEZMOI_OS_RELEASE_VARIANT_ID: string;
		CHEZMOI_OS_RELEASE_ID: string;
		CHEZMOI_KERNEL_VERSION: string;
		CHEZMOI_OS_RELEASE_PRETTY_NAME: string;
		ATUIN_SESSION: string;
		npm_config_user_agent: string;
		CHEZMOI_COMMAND_DIR: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_execpath: string;
		CHEZMOI_OS_RELEASE_VERSION_ID: string;
		ATUIN_HISTORY_ID: string;
		CHEZMOI_GROUP: string;
		XDG_RUNTIME_DIR: string;
		CHEZMOI_CONFIG_FILE: string;
		CHEZMOI_OS_RELEASE_REDHAT_BUGZILLA_PRODUCT_VERSION: string;
		CHEZMOI_KERNEL_OSRELEASE: string;
		NODE_PATH: string;
		SSH_CLIENT: string;
		DEBUGINFOD_URLS: string;
		CHEZMOI_ARCH: string;
		DOCKER_HOST: string;
		npm_package_json: string;
		DEBUGINFOD_IMA_CERT_PATH: string;
		SKLEIN_DEVBOX_NAME: string;
		SKLEIN_DEVBOX_GOPASS: string;
		CHEZMOI_OS_RELEASE_DEFAULT_HOSTNAME: string;
		CHEZMOI_HOSTNAME: string;
		CHEZMOI_OS_RELEASE_SUPPORT_URL: string;
		MISE_SHELL: string;
		CHEZMOI_OS_RELEASE_HOME_URL: string;
		PATH: string;
		CHEZMOI_OS_RELEASE_SUPPORT_END: string;
		npm_config_node_gyp: string;
		INSTANCE_ID: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		CHEZMOI_OS_RELEASE_VERSION_CODENAME: string;
		MAIL: string;
		SSH_TTY: string;
		CHEZMOI_OS: string;
		CHEZMOI_SOURCE_DIR: string;
		PULSE_SERVER: string;
		__MISE_ZSH_CHPWD_RAN: string;
		npm_node_execpath: string;
		CHEZMOI_OS_RELEASE_REDHAT_BUGZILLA_PRODUCT: string;
		OLDPWD: string;
		CHEZMOI_DEST_DIR: string;
		TERM_PROGRAM: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		PUBLIC_GIT_DATE: string;
		PUBLIC_GIT_BRANCH: string;
		PUBLIC_BUILD_STAMP: string;
		PUBLIC_GIT_HASH: string;
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
