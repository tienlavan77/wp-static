import assert from "node:assert/strict";
import test from "node:test";
import createCommercePublishingGateway from "../framework/src/publishing/createCommercePublishingGateway.js";
import createPublishEventCoordinator from "../framework/src/publishing/createPublishEventCoordinator.js";

test("Commerce Publishing Gateway maps WooCommerce product changes to Scheduler", () => {
  const calls = [];
  const gateway = createCommercePublishingGateway({
    publishing: createPublishEventCoordinator({
      scheduler: { trigger(input) { calls.push(input); return { job: { id: "job-1" }, ok: true }; } }
    })
  });
  const result = gateway.publish({
    event: { action: "product.updated", eventId: "woo-1", id: 44, slug: "iphone-15" },
    siteId: "site-a"
  });

  assert.equal(result.events[0].source, "woocommerce");
  assert.deepEqual(calls, [{ changed: ["product:iphone-15"], siteId: "site-a", triggerType: "webhook" }]);
});

test("Commerce child changes rebuild the parent product incrementally", () => {
  const calls = [];
  const gateway = createCommercePublishingGateway({
    publishing: createPublishEventCoordinator({
      scheduler: { trigger(input) { calls.push(input); return { job: { id: "job-1" }, ok: true }; } }
    })
  });
  gateway.publish({ event: { action: "variation.updated", id: 501, parentId: 44, parentSlug: "danh-thiep" }, siteId: "site-a" });
  gateway.publish({ event: { action: "stock.updated", id: 501, productId: 44, productSlug: "danh-thiep", eventId: "stock-1" }, siteId: "site-a" });
  assert.deepEqual(calls.map((item) => item.changed), [["product:danh-thiep"], ["product:danh-thiep"]]);
});

test("Commerce publishing remains Site-scoped and idempotent", () => {
  const calls = [];
  const gateway = createCommercePublishingGateway({
    publishing: createPublishEventCoordinator({
      scheduler: { trigger(input) { calls.push(input); return { job: { id: "job-1" }, ok: true }; } }
    })
  });
  const first = gateway.publish({ event: { action: "category.updated", eventId: "cat-1", id: 7, slug: "paper", taxonomy: "product_cat" }, siteId: "site-a" });
  const duplicate = gateway.publish({ event: { action: "category.updated", eventId: "cat-1", id: 7, slug: "paper", taxonomy: "product_cat" }, siteId: "site-a" });
  const otherSite = gateway.publish({ event: { action: "category.updated", eventId: "cat-1", id: 7, slug: "paper", taxonomy: "product_cat" }, siteId: "site-b" });
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(otherSite.duplicate, false);
  assert.equal(calls.length, 2);
});
