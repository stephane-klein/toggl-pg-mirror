import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage();

export function runWithMetrics(fn) {
    return als.run({ queries: [], pageStart: performance.now() }, fn);
}

export function getMetrics() {
    return als.getStore();
}

export function summarize() {
    const store = als.getStore();
    if (!store) return null;
    return {
        sqlQueryCount: store.queries.length,
        totalQueryMs: store.queries.reduce((a, q) => a + q.durationMs, 0),
        totalPageMs: performance.now() - store.pageStart,
    };
}
