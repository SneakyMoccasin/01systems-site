"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetRuntimeProfile = resetRuntimeProfile;
exports.getRuntimeProfileSummary = getRuntimeProfileSummary;
exports.profileCount = profileCount;
exports.profileValue = profileValue;
exports.profileMeasure = profileMeasure;
exports.profileMeasureAsync = profileMeasureAsync;
const STORE_KEY = "__PULSE_RUNTIME_PROFILE_STORE__";
function now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}
function isEnabled() {
    return (process.env.NEXT_PUBLIC_PULSE_PROFILE === "1" ||
        process.env.PULSE_PROFILE === "1" ||
        Boolean(globalThis.__PULSE_PROFILE_ENABLED__));
}
function getStore() {
    const globalWithStore = globalThis;
    if (!globalWithStore[STORE_KEY]) {
        globalWithStore[STORE_KEY] = { metrics: {} };
    }
    return globalWithStore[STORE_KEY];
}
function getMetric(name, unit) {
    const store = getStore();
    if (!store.metrics[name]) {
        store.metrics[name] = {
            count: 0,
            total: 0,
            max: Number.NEGATIVE_INFINITY,
            min: Number.POSITIVE_INFINITY,
            last: 0,
            unit,
        };
    }
    if (!store.metrics[name].unit) {
        store.metrics[name].unit = unit;
    }
    return store.metrics[name];
}
function ensureWindowApi() {
    if (typeof window === "undefined")
        return;
    const windowWithProfiler = window;
    if (windowWithProfiler.__pulseProfile)
        return;
    windowWithProfiler.__pulseProfile = {
        enable: () => {
            windowWithProfiler.__PULSE_PROFILE_ENABLED__ = true;
            return getRuntimeProfileSummary();
        },
        disable: () => {
            windowWithProfiler.__PULSE_PROFILE_ENABLED__ = false;
            return getRuntimeProfileSummary();
        },
        dump: () => {
            const summary = getRuntimeProfileSummary();
            console.table(summary);
            return summary;
        },
        reset: () => {
            resetRuntimeProfile();
        },
        summary: getRuntimeProfileSummary,
    };
}
function resetRuntimeProfile() {
    getStore().metrics = {};
}
function getRuntimeProfileSummary() {
    return Object.entries(getStore().metrics)
        .map(([name, metric]) => ({
        name,
        unit: metric.unit,
        count: metric.count,
        total: Number(metric.total.toFixed(3)),
        avg: Number((metric.total / Math.max(metric.count, 1)).toFixed(3)),
        max: metric.max === Number.NEGATIVE_INFINITY ? 0 : Number(metric.max.toFixed(3)),
        min: metric.min === Number.POSITIVE_INFINITY ? 0 : Number(metric.min.toFixed(3)),
        last: Number(metric.last.toFixed(3)),
    }))
        .sort((a, b) => {
        if (b.total !== a.total)
            return b.total - a.total;
        return b.count - a.count;
    });
}
function profileCount(name, delta = 1) {
    if (!isEnabled())
        return;
    ensureWindowApi();
    const metric = getMetric(name, "count");
    metric.count += 1;
    metric.total += delta;
    metric.last = delta;
    metric.max = Math.max(metric.max, delta);
    metric.min = Math.min(metric.min, delta);
}
function profileValue(name, value, unit = "value") {
    if (!isEnabled() || !Number.isFinite(value))
        return;
    ensureWindowApi();
    const metric = getMetric(name, unit);
    metric.count += 1;
    metric.total += value;
    metric.last = value;
    metric.max = Math.max(metric.max, value);
    metric.min = Math.min(metric.min, value);
}
function profileMeasure(name, fn) {
    if (!isEnabled()) {
        return fn();
    }
    const startedAt = now();
    try {
        return fn();
    }
    finally {
        profileValue(name, now() - startedAt, "ms");
    }
}
async function profileMeasureAsync(name, fn) {
    if (!isEnabled()) {
        return fn();
    }
    const startedAt = now();
    try {
        return await fn();
    }
    finally {
        profileValue(name, now() - startedAt, "ms");
    }
}
