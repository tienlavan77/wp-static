import assert from "node:assert/strict";
import test from "node:test";
import createPerformanceService from "../framework/src/performance/createPerformanceService.js";
import createSiteCacheService, { CacheDomain } from "../framework/src/cache/createSiteCacheService.js";
import createCommerceRuntime from "../framework/src/runtime/commerce/createCommerceRuntime.js";
import createBuildMetrics from "../framework/src/builder/report/createBuildMetrics.js";

test("Performance Service records deterministic Site-scoped operation metrics", async () => {
  const ticks = [0, 12, 20, 25, 30, 34];
  const service = createPerformanceService({ nowMs: () => ticks.shift(), siteId: "site-a" });
  assert.equal(await service.measure({ resource: "products", service: "commerce" }, async () => "ok"), "ok");
  await assert.rejects(() => service.measure({ resource: "submit", service: "forms" }, async () => { throw new Error("failed"); }), /failed/);
  await service.measure({ resource: "products", service: "commerce" }, async () => "again");
  const snapshot = service.snapshot();

  assert.equal(snapshot.siteId, "site-a");
  assert.deepEqual(snapshot.operations.map((item) => item.key), ["commerce:products", "forms:submit"]);
  assert.equal(snapshot.operations[0].count, 2);
  assert.equal(snapshot.operations[0].totalDurationMs, 16);
  assert.equal(snapshot.operations[1].errors, 1);
  assert.equal(Object.isFrozen(snapshot), true);
});

test("Site Cache reports observable hit and miss metrics", () => {
  const performanceService = createPerformanceService({ siteId: "site-a" });
  const cache = createSiteCacheService({ performanceService, siteId: "site-a" });
  const key = { key: "1", resource: "product", service: CacheDomain.COMMERCE };
  assert.equal(cache.get(key), null);
  cache.set(key, { id: 1 });
  assert.deepEqual(cache.get(key), { id: 1 });
  assert.deepEqual(performanceService.snapshot().cache, { hitRate: 0.5, hits: 1, misses: 1 });
});

test("Commerce Runtime exposes request baseline without changing responses", async () => {
  let tick = 0;
  const performanceService = createPerformanceService({ nowMs: () => tick += 5, siteId: "site-a" });
  const runtime = createCommerceRuntime({ performanceService, siteId: "site-a" });
  const response = await runtime.handle(new Request("http://runtime.local/api/cart"));
  assert.equal(response.status, 200);
  const metric = runtime.performance.snapshot().operations[0];
  assert.equal(metric.key, "commerce:get");
  assert.equal(metric.count, 1);
  assert.equal(metric.lastDurationMs, 5);
});

test("Build metrics expose cache efficiency and incremental output", () => {
  const metrics = createBuildMetrics({
    result: { fullBuild: false, pagesWritten: 2, totalPages: 10 },
    sitePlan: { cache: { collectionCacheHit: true, contentCacheHit: true, routeRenderCacheHits: 7, routeRenderCacheMisses: 1 }, pages: new Array(10) }
  });
  assert.deepEqual(metrics.cache, { hitRate: 0.9, hits: 9, misses: 1 });
  assert.deepEqual(metrics.incremental, { fullBuild: false, pagesWritten: 2, totalPages: 10 });
});
