import deepFreeze from "../shared/deepFreeze.js";

export const SITE_CACHE_SCHEMA = "wpsc.site-cache";
export const SITE_CACHE_VERSION = 1;
export const CacheDomain = Object.freeze({
  BUILD: "build",
  COMMERCE: "commerce",
  CONTENT: "content",
  MEDIA: "media",
  RUNTIME: "runtime",
  SEARCH: "search",
  SESSION: "session",
  SOURCE: "source"
});

const domains = new Set(Object.values(CacheDomain));

export default function createSiteCacheService(options = {}) {
  const siteId = normalizePart(options.siteId, "Site id");
  const storage = options.storage ?? new Map();
  const now = options.now ?? (() => new Date().toISOString());
  const performanceService = options.performanceService;
  let buildId = String(options.buildId || "initial");
  const metrics = { deletes: 0, hits: 0, invalidations: 0, misses: 0, sets: 0 };

  function createKey(input = {}) {
    const service = normalizeDomain(input.service);
    const resource = normalizePart(input.resource ?? "default", "Cache resource");
    const key = normalizePart(input.key ?? "default", "Cache key");
    return [siteId, buildId, service, resource, key].map(encodeURIComponent).join(":");
  }

  function get(input) {
    const cacheKey = createKey(input);
    const entry = storage.get(cacheKey);
    if (!entry) {
      metrics.misses += 1;
      performanceService?.recordCache?.({ hit: false });
      return null;
    }
    metrics.hits += 1;
    performanceService?.recordCache?.({ hit: true });
    return structuredClone(entry.value);
  }

  function set(input, value) {
    const cacheKey = createKey(input);
    storage.set(cacheKey, { descriptor: descriptor(input), storedAt: now(), value: structuredClone(value) });
    metrics.sets += 1;
    return cacheKey;
  }

  function remove(input) {
    const removed = storage.delete(createKey(input));
    if (removed) metrics.deletes += 1;
    return removed;
  }

  async function readThrough(input, loader) {
    if (typeof loader !== "function") throw new TypeError("Cache read-through requires a source loader.");
    const cached = get(input);
    if (cached !== null) return deepFreeze({ cached: true, value: cached });
    const value = await loader();
    set(input, value);
    return deepFreeze({ cached: false, value: structuredClone(value) });
  }

  function invalidate(filter = {}) {
    const services = filter.services ? new Set(filter.services.map(normalizeDomain)) : null;
    let invalidated = 0;
    for (const [cacheKey, entry] of storage) {
      if (!cacheKey.startsWith(`${encodeURIComponent(siteId)}:`)) continue;
      const item = entry.descriptor;
      if (services && !services.has(item.service)) continue;
      if (filter.resource && item.resource !== String(filter.resource)) continue;
      if (filter.key && item.key !== String(filter.key)) continue;
      storage.delete(cacheKey);
      invalidated += 1;
    }
    metrics.invalidations += invalidated;
    return deepFreeze({ invalidated, siteId });
  }

  function invalidateEvent(event = {}) {
    if (String(event.siteId ?? "") !== siteId) throw new Error("Cache event Site mismatch.");
    const type = String(event.entityType ?? event.type ?? "").toLowerCase();
    const services = type === "media"
      ? [CacheDomain.MEDIA, CacheDomain.CONTENT, CacheDomain.BUILD]
      : ["product", "variation", "price", "inventory"].includes(type)
        ? [CacheDomain.COMMERCE, CacheDomain.SEARCH, CacheDomain.BUILD]
        : type === "route"
          ? [CacheDomain.CONTENT, CacheDomain.SEARCH, CacheDomain.BUILD]
          : [CacheDomain.SOURCE, CacheDomain.CONTENT, CacheDomain.SEARCH, CacheDomain.BUILD];
    return invalidate({ services });
  }

  function activateBuild(nextBuildId) {
    const next = normalizePart(nextBuildId, "Build id");
    if (next === buildId) return deepFreeze({ buildId, invalidated: 0, siteId });
    const previous = buildId;
    const invalidated = invalidate({});
    buildId = next;
    return deepFreeze({ buildId, invalidated: invalidated.invalidated, previousBuildId: previous, siteId });
  }

  function snapshot() {
    let size = 0;
    for (const key of storage.keys()) if (key.startsWith(`${encodeURIComponent(siteId)}:`)) size += 1;
    return deepFreeze({ buildId, metrics: { ...metrics }, schema: SITE_CACHE_SCHEMA, schemaVersion: SITE_CACHE_VERSION, siteId, size });
  }

  return Object.freeze({ activateBuild, createKey, get, invalidate, invalidateEvent, readThrough, remove, set, siteId, snapshot });
}

function descriptor(input = {}) {
  return { key: String(input.key ?? "default"), resource: String(input.resource ?? "default"), service: normalizeDomain(input.service) };
}

function normalizeDomain(value) {
  const domain = String(value ?? "").trim().toLowerCase();
  if (!domains.has(domain)) throw new TypeError(`Unsupported cache service: ${value}`);
  return domain;
}

function normalizePart(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${label} is required.`);
  return normalized;
}
