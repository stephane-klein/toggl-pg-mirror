import postgres from "postgres";

import { logger } from "./logger.js";
import { getMetrics } from "./pg-metrics.js";

const POSTGRES_URL = process.env.TOGGL_PG_MIRROR_POSTGRES_URL;
export const POSTGRES_SCHEMA = process.env.TOGGL_PG_MIRROR_POSTGRES_SCHEMA || "public";

const raw = postgres(POSTGRES_URL, {
    idle_timeout: 1,
    connection: {
        search_path: POSTGRES_SCHEMA,
    },
    onnotice: (notice) => logger.debug({ ...notice }, "PostgreSQL notice"),
});

const INSTRUMENTED = Symbol("instrumented");

function wrapQuery(query, _sqlStr) {
    const startTime = performance.now();
    const originalHandle = query.handle;
    query.handle = function () {
        try {
            return originalHandle.apply(this, arguments);
        } finally {
            const store = getMetrics();
            if (store) {
                store.queries.push({
                    durationMs: performance.now() - startTime,
                });
            }
        }
    };
    return query;
}

function instrumentSql(instance) {
    if (instance[INSTRUMENTED]) return instance;
    instance[INSTRUMENTED] = true;

    return new Proxy(instance, {
        apply(target, thisArg, args) {
            const query = Reflect.apply(target, thisArg, args);
            const sqlStr = String(args[0]?.[0] ?? "").slice(0, 50);
            return wrapQuery(query, sqlStr);
        },
        get(target, prop, receiver) {
            if (prop === INSTRUMENTED) return true;

            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== "function") return value;

            if (prop === "unsafe" || prop === "file") {
                return function (...args) {
                    const sqlStr = String(args[0] ?? "").slice(0, 50);
                    const query = value.apply(target, args);
                    return wrapQuery(query, sqlStr);
                };
            }

            if (prop === "begin") {
                return function (callback, ...rest) {
                    return value.call(
                        target,
                        (scopedSql, ...cbArgs) => callback(instrumentSql(scopedSql), ...cbArgs),
                        ...rest,
                    );
                };
            }

            if (prop === "reserve") {
                return async function (...args) {
                    const reserved = await value.apply(target, args);
                    reserved.sql = instrumentSql(reserved.sql);
                    return reserved;
                };
            }

            return value;
        },
    });
}

export const sql = instrumentSql(raw);

export async function waitForDb(maxRetries = 10, delayMs = 1000) {
    logger.info(`Attempting to connect to ${POSTGRES_URL.replace(/\/\/.*:/, "//xxxxx:")}`);

    for (let i = 1; i <= maxRetries; i++) {
        try {
            await sql`SELECT 1`;
            return;
        } catch (err) {
            if (i === maxRetries) throw err;
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
