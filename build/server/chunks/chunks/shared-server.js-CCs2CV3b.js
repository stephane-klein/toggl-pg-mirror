/**
* `$env/dynamic/public`
* @type {Record<string, string>}
*/
var public_env = {};
/** @type {(environment: Record<string, string>) => void} */
function set_private_env(environment) {}
/** @type {(environment: Record<string, string>) => void} */
function set_public_env(environment) {
	public_env = environment;
}

export { set_public_env as a, public_env as p, set_private_env as s };
//# sourceMappingURL=shared-server.js-CCs2CV3b.js.map
