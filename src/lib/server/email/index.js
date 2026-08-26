import * as yaml from "js-yaml";

const templates = import.meta.glob("./*.yaml", {
    query: "?raw",
    import: "default",
    eager: true,
});

const cache = {};

function load(name) {
    if (!cache[name]) {
        const raw = templates[`./${name}.yaml`];
        if (!raw) throw new Error(`Template not found: ${name}`);
        cache[name] = yaml.load(raw);
    }
    return cache[name];
}

export function renderEmail(name, { link, locale }) {
    const tpl = load(name);
    const t = tpl[locale] || tpl.en;
    return {
        subject: t.subject,
        text: t.text.replaceAll("{{ link }}", link),
    };
}
