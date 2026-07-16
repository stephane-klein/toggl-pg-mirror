import globals from "globals";
import js from "@eslint/js";
import sveltePlugin from "eslint-plugin-svelte";
import eslintConfigPrettier from "eslint-config-prettier";

const baseLanguageOptions = {
    ecmaVersion: 2022,
    sourceType: "module",
    globals: {
        ...globals.browser,
        ...globals.node,
    },
};

const baseRules = {
    semi: "error",
    "array-callback-return": "error",
    "no-useless-concat": "error",
    "space-before-function-paren": ["error", { anonymous: "always", named: "never", asyncArrow: "always" }],
    "no-duplicate-imports": "error",
    "no-irregular-whitespace": "off",
    "no-unused-vars": [
        "warn",
        {
            args: "all",
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
        },
    ],
};

export default [
    {
        ignores: ["**/build", "**/dist", "**/.secrets", "**/.svelte-kit", "**/node_modules", "pnpm-lock.yaml"],
    },
    js.configs.recommended,
    ...sveltePlugin.configs["flat/recommended"],
    ...sveltePlugin.configs["flat/prettier"],
    eslintConfigPrettier,
    {
        files: ["**/*.{js,mjs}"],
        languageOptions: baseLanguageOptions,
        rules: {
            ...baseRules,
            "svelte/no-navigation-without-resolve": "off",
        },
    },
    {
        files: ["**/*.svelte"],
        languageOptions: baseLanguageOptions,
        rules: {
            ...baseRules,
            "svelte/no-navigation-without-resolve": "off",
        },
    },
];
