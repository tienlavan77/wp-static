import assert from "node:assert/strict";
import test from "node:test";
import createSiteCacheService, { CacheDomain } from "../framework/src/cache/createSiteCacheService.js";
import createPublishEventCoordinator from "../framework/src/publishing/createPublishEventCoordinator.js";

test("Site Cache Service creates deterministic Site-scoped keys and read-through values", async () => {
  const storage = new Map();
  const cache = createSiteCacheService({ siteId: "site-a", storage });
  const input = { key: "post-1", resource: "document", service: CacheDomain.CONTENT };
  assert.equal(cache.createKey(input), "site-a:initial:content:document:post-1");
  assert.equal((await cache.readThrough(input, async () => ({ title: "Hello" }))).cached, false);
  assert.deepEqual(await cache.readThrough(input, async () => ({ title: "wrong" })), { cached: true, value: { title: "Hello" } });
  assert.equal(cache.snapshot().metrics.hits, 1);
  assert.equal(cache.snapshot().metrics.misses, 1);
});

test("Site Cache Service versions entries by published Build snapshot", () => {
  const cache = createSiteCacheService({ siteId: "site-a" });
  cache.set({ key: "home", resource: "route", service: CacheDomain.CONTENT }, { title: "old" });
  cache.activateBuild("build-2");
  assert.equal(cache.get({ key: "home", resource: "route", service: CacheDomain.CONTENT }), null);
  assert.equal(cache.snapshot().buildId, "build-2");
});

test("Site Cache Service isolates Sites even with shared storage", () => {
  const storage = new Map();
  const first = createSiteCacheService({ siteId: "site-a", storage });
  const second = createSiteCacheService({ siteId: "site-b", storage });
  first.set({ key: "42", resource: "product", service: CacheDomain.COMMERCE }, { price: 100 });
  assert.deepEqual(first.get({ key: "42", resource: "product", service: CacheDomain.COMMERCE }), { price: 100 });
  assert.equal(second.get({ key: "42", resource: "product", service: CacheDomain.COMMERCE }), null);
  assert.throws(() => first.invalidateEvent({ siteId: "site-b", entityType: "product" }), /Site mismatch/);
});

test("Cache invalidation maps publishing and commerce domains", () => {
  const cache = createSiteCacheService({ siteId: "site-a" });
  cache.set({ key: "1", resource: "product", service: CacheDomain.COMMERCE }, { price: 1 });
  cache.set({ key: "1", resource: "product", service: CacheDomain.SEARCH }, { hits: [] });
  cache.set({ key: "1", resource: "post", service: CacheDomain.CONTENT }, { title: "x" });
  cache.set({ key: "1", resource: "post", service: CacheDomain.SOURCE }, { raw: true });
  assert.equal(cache.invalidateEvent({ siteId: "site-a", entityType: "product" }).invalidated, 2);
  assert.equal(cache.snapshot().size, 2);
  assert.equal(cache.invalidate({ services: [CacheDomain.SOURCE] }).invalidated, 1);
  assert.equal(cache.snapshot().size, 1);
});

test("Publishing Coordinator invalidates Site cache after successful queueing", () => {
  const invalidated = [];
  const coordinator = createPublishEventCoordinator({
    cache: { invalidateEvent(event) { invalidated.push(event); } },
    scheduler: { trigger: () => ({ job: { id: "job-1" }, ok: true }) }
  });
  coordinator.publish({
    payload: { action: "publish", changed: [{ id: 12, postType: "post", slug: "welcome" }], eventId: "event-1", source: "wordpress" },
    siteId: "site-a"
  });
  assert.equal(invalidated.length, 1);
  assert.equal(invalidated[0].siteId, "site-a");
});
