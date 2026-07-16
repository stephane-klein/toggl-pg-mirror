export default {
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    arrowParens: "always",
    plugins: ["prettier-plugin-svelte"],
    svelteAllowShorthand: true,
    singleAttributePerLine: true,
    overrides: [
        {
            files: "*.svelte",
            options: {
                parser: "svelte",
                svelteSortOrder: "options-scripts-markup-styles",
                svelteIndentScriptAndStyle: true,
            },
        },
        { files: "*.md", options: { tabWidth: 2 } },
        { files: "*.{yaml,yml}", options: { tabWidth: 2 } },
    ],
};
