// Adapted from svelte-codemirror-search-field (https://github.com/stephane-klein/svelte-codemirror-search-field), MIT license.
import { WidgetType } from "@codemirror/view";

function tagHue(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

export class TagWidget extends WidgetType {
    constructor({ tag, onClick }) {
        super();
        this.tag = tag;
        this.onClick = onClick;
    }

    eq(other) {
        return other instanceof TagWidget && other.tag === this.tag;
    }

    toDOM() {
        const el = document.createElement("span");
        el.textContent = `#${this.tag}`;
        el.className = "cm-tag-pill";
        const hue = tagHue(this.tag);
        el.style.backgroundColor = `hsl(${hue}, 55%, 88%)`;
        el.style.color = `hsl(${hue}, 50%, 25%)`;

        el.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            this.onClick();
        });

        return el;
    }
}
