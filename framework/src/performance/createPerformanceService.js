import deepFreeze from "../shared/deepFreeze.js";

export const PERFORMANCE_BASELINE_SCHEMA = "wpsc.performance-baseline";
export const PERFORMANCE_BASELINE_VERSION = 1;

export default function createPerformanceService(options = {}) {
  const siteId = String(options.siteId ?? "").trim();
  const nowMs = options.nowMs ?? (() => performance.now());
  if (!siteId) throw new TypeError("Performance Service requires a Site id.");
  const operations = new Map();
  const cache = { hits: 0, misses: 0 };

  async function measure(input = {}, operation) {
    if (typeof operation !== "function") throw new TypeError("Performance measurement requires an operation.");
    const key = metricKey(input);
    const startedAt = nowMs();
    try {
      const value = await operation();
      record(key, nowMs() - startedAt, true);
      return value;
    } catch (cause) {
      record(key, nowMs() - startedAt, false);
      throw cause;
    }
  }

  function recordCache(input = {}) {
    if (input.hit === true) cache.hits += 1;
    else cache.misses += 1;
  }

  function snapshot() {
    const requests = [...operations.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([key, value]) => ({
      averageDurationMs: value.count ? value.totalDurationMs / value.count : 0,
      count: value.count,
      errors: value.errors,
      key,
      lastDurationMs: value.lastDurationMs,
      maxDurationMs: value.maxDurationMs,
      minDurationMs: value.minDurationMs,
      totalDurationMs: value.totalDurationMs
    }));
    const totalCache = cache.hits + cache.misses;
    return deepFreeze({
      cache: { ...cache, hitRate: totalCache ? cache.hits / totalCache : 0 },
      operations: requests,
      schema: PERFORMANCE_BASELINE_SCHEMA,
      schemaVersion: PERFORMANCE_BASELINE_VERSION,
      siteId
    });
  }

  function record(key, duration, ok) {
    const current = operations.get(key) ?? { count: 0, errors: 0, lastDurationMs: 0, maxDurationMs: 0, minDurationMs: Infinity, totalDurationMs: 0 };
    current.count += 1;
    current.errors += ok ? 0 : 1;
    current.lastDurationMs = duration;
    current.maxDurationMs = Math.max(current.maxDurationMs, duration);
    current.minDurationMs = Math.min(current.minDurationMs, duration);
    current.totalDurationMs += duration;
    operations.set(key, current);
  }

  return Object.freeze({ measure, recordCache, siteId, snapshot });
}

function metricKey(input) {
  const service = String(input.service ?? "runtime").trim().toLowerCase();
  const resource = String(input.resource ?? "request").trim().toLowerCase();
  if (!service || !resource) throw new TypeError("Performance metric service and resource are required.");
  return `${service}:${resource}`;
}
