const BASE = "http://_";

export function modifyCurrentUrl(currentUrl, newPath = null, params = {}) {
    const url = typeof currentUrl === "string" ? new URL(currentUrl, BASE) : new URL(currentUrl.href, BASE);

    if (newPath !== null) {
        const parsed = new URL(newPath, BASE);
        if (parsed.search) {
            console.warn("modifyCurrentUrl: newPath contains query string, ignored. Use params argument instead.");
        }
        url.pathname = parsed.pathname;
        url.search = "";
    }

    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, String(value));
        }
    }

    return `${url.pathname}${url.search}`;
}
