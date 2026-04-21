type RuntimeProfileMetric = {
  count: number;
  total: number;
  max: number;
  min: number;
  last: number;
  unit: string;
};

type RuntimeProfileStore = {
  metrics: Record<string, RuntimeProfileMetric>;
};

const STORE_KEY = "__PULSE_RUNTIME_PROFILE_STORE__";

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function isEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PULSE_PROFILE === "1" ||
    process.env.PULSE_PROFILE === "1" ||
    Boolean((globalThis as Record<string, unknown>).__PULSE_PROFILE_ENABLED__)
  );
}

function getStore(): RuntimeProfileStore {
  const globalWithStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: RuntimeProfileStore;
  };

  if (!globalWithStore[STORE_KEY]) {
    globalWithStore[STORE_KEY] = { metrics: {} };
  }

  return globalWithStore[STORE_KEY] as RuntimeProfileStore;
}

function getMetric(name: string, unit: string): RuntimeProfileMetric {
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

function ensureWindowApi(): void {
  if (typeof window === "undefined") return;

  const windowWithProfiler = window as typeof window & {
    __pulseProfile?: {
      enable: () => ReturnType<typeof getRuntimeProfileSummary>;
      disable: () => ReturnType<typeof getRuntimeProfileSummary>;
      dump: () => ReturnType<typeof getRuntimeProfileSummary>;
      reset: () => void;
      summary: typeof getRuntimeProfileSummary;
    };
    __PULSE_PROFILE_ENABLED__?: boolean;
  };

  if (windowWithProfiler.__pulseProfile) return;

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

export function resetRuntimeProfile(): void {
  getStore().metrics = {};
}

export function getRuntimeProfileSummary() {
  return Object.entries(getStore().metrics)
    .map(([name, metric]) => ({
      name,
      unit: metric.unit,
      count: metric.count,
      total: Number(metric.total.toFixed(3)),
      avg: Number((metric.total / Math.max(metric.count, 1)).toFixed(3)),
      max:
        metric.max === Number.NEGATIVE_INFINITY ? 0 : Number(metric.max.toFixed(3)),
      min:
        metric.min === Number.POSITIVE_INFINITY ? 0 : Number(metric.min.toFixed(3)),
      last: Number(metric.last.toFixed(3)),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.count - a.count;
    });
}

export function profileCount(name: string, delta: number = 1): void {
  if (!isEnabled()) return;

  ensureWindowApi();
  const metric = getMetric(name, "count");
  metric.count += 1;
  metric.total += delta;
  metric.last = delta;
  metric.max = Math.max(metric.max, delta);
  metric.min = Math.min(metric.min, delta);
}

export function profileValue(
  name: string,
  value: number,
  unit: string = "value"
): void {
  if (!isEnabled() || !Number.isFinite(value)) return;

  ensureWindowApi();
  const metric = getMetric(name, unit);
  metric.count += 1;
  metric.total += value;
  metric.last = value;
  metric.max = Math.max(metric.max, value);
  metric.min = Math.min(metric.min, value);
}

export function profileMeasure<T>(name: string, fn: () => T): T {
  if (!isEnabled()) {
    return fn();
  }

  const startedAt = now();

  try {
    return fn();
  } finally {
    profileValue(name, now() - startedAt, "ms");
  }
}

export async function profileMeasureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isEnabled()) {
    return fn();
  }

  const startedAt = now();

  try {
    return await fn();
  } finally {
    profileValue(name, now() - startedAt, "ms");
  }
}
