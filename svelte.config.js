import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter(),
        csrf: {
            checkOrigin: false,
        },
        experimental: {
            remoteFunctions: true,
        },
    },
    compilerOptions: {
        experimental: {
            async: true,
        },
    },
};

export default config;
