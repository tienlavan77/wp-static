import assert from "node:assert/strict";
import test from "node:test";
import createCommerceProviderContract from "../framework/src/commerce/createCommerceProviderContract.js";
import createCommerceCatalogService from "../framework/src/commerce/createCommerceCatalogService.js";
import createSearchService from "../framework/src/search/createSearchService.js";
import createSharedRenderingContext from "../framework/src/theme/createSharedRenderingContext.js";
import createAdvancedSeoService from "../framework/src/seo/createAdvancedSeoService.js";
import createSiteRoutePolicy from "../framework/src/routing/createSiteRoutePolicy.js";
import createCommerceRuntime from "../framework/src/runtime/commerce/createCommerceRuntime.js";
import createPerformanceService from "../framework/src/performance/createPerformanceService.js";
import createSiteCacheService, { CacheDomain } from "../framework/src/cache/createSiteCacheService.js";
import createCommercePublishingGateway from "../framework/src/publishing/createCommercePublishingGateway.js";
import createPublishEventCoordinator from "../framework/src/publishing/createPublishEventCoordinator.js";

test("Sprint 8 advanced website experience remains complete and Site-isolated", async () => {
  const siteA = createWebsite("site-a", "https://a.example.test", "Hop giay cao cap");
  const siteB = createWebsite("site-b", "https://b.example.test", "Ao thun cao cap");

  assert.equal(siteA.catalog.productRoutes[0].path, "/hop-giay-cao-cap");
  assert.equal(siteA.search.query(siteA.index, { query: "hop giay", siteId: "site-a" }).total, 1);
  assert.equal(siteB.search.query(siteA.index, { query: "hop giay", siteId: "site-b" }).total, 0);
  assert.equal(siteA.rendering.commerce.siteId, "site-a");
  assert.equal(siteA.seo.metadata.structuredData[0]["@type"], "Product");
  assert.equal(siteA.seo.metadata.canonical, "https://a.example.test/hop-giay-cao-cap");

  const storage = new Map();
  const cacheA = createSiteCacheService({ performanceService: siteA.performance, siteId: "site-a", storage });
  const cacheB = createSiteCacheService({ siteId: "site-b", storage });
  const cacheKey = { key: "44", resource: "product", service: CacheDomain.COMMERCE };
  cacheA.set(cacheKey, { price: 120000 });
  assert.equal(cacheB.get(cacheKey), null);
  assert.equal(cacheA.get(cacheKey).price, 120000);

  const providerOrders = [];
  const runtimeA = createCustomerRuntime("site-a", providerOrders, siteA.performance);
  const runtimeB = createCustomerRuntime("site-b", [], createPerformanceService({ siteId: "site-b" }));
  const login = await api(runtimeA, "/api/auth/login", { password: "secret", username: "customer" });
  assert.equal(login.body.identity.siteId, "site-a");
  const account = await api(runtimeA, "/api/account/me", null, login.cookie, "GET");
  assert.equal(account.body.user.id, 101);

  await api(runtimeA, "/api/cart/items", { productId: 44, quantity: 2, variationId: 501 }, login.cookie);
  const refreshed = await api(runtimeA, "/api/cart/refresh", {}, login.cookie);
  assert.equal(refreshed.body.items[0].pricing.unitPrice, 120000);
  const foreignCart = await api(runtimeB, "/api/cart", null, login.cookie, "GET");
  assert.equal(foreignCart.body.itemCount, 0);

  const checkout = await api(runtimeA, "/api/checkout", {
    customer: { address: "So 2 Dong Ho", email: "anh@example.com", name: "Anh Tien" },
    items: [{ productId: 999, quantity: 99 }],
    payment: "cod"
  }, login.cookie);
  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.checkout.status, "submitted");
  assert.deepEqual(providerOrders[0].payload.items, [{ productId: 44, quantity: 2, variationId: 501, variant: { id: 501 } }]);

  const form = await api(runtimeA, "/api/forms/contact", { email: "anh@example.com", message: "Hello", name: "Anh" }, login.cookie);
  assert.equal(form.body.status, "submitted");
  assert.equal(form.body.siteId, "site-a");

  const scheduled = [];
  const gateway = createCommercePublishingGateway({
    publishing: createPublishEventCoordinator({
      cache: cacheA,
      scheduler: { trigger(input) { scheduled.push(input); return { job: { id: "job-1" }, ok: true }; } }
    })
  });
  const published = gateway.publish({ event: { action: "stock.updated", eventId: "stock-44-1", id: 501, productId: 44, productSlug: "hop-giay-cao-cap" }, siteId: "site-a" });
  assert.deepEqual(published.changed, ["product:hop-giay-cao-cap"]);
  assert.equal(scheduled[0].siteId, "site-a");
  assert.equal(cacheA.get(cacheKey), null);
  assert.ok(siteA.performance.snapshot().operations.some((metric) => metric.key === "checkout:post"));
});

function createWebsite(siteId, url, title) {
  const slug = siteId === "site-a" ? "hop-giay-cao-cap" : "ao-thun-cao-cap";
  const product = { data: { price: 120000, terms: [], variants: [{ id: 501, price: 120000 }] }, domain: "woocommerce", id: "product-44", slug, status: "publish", title, type: "product" };
  const provider = createCommerceProviderContract({ products: [product], siteId, store: { currency: "VND" } });
  const routePolicy = createSiteRoutePolicy({ siteId, siteUrl: url });
  const catalog = createCommerceCatalogService({ routingPolicy: routePolicy, siteId }).compose(provider);
  const search = createSearchService({ siteId });
  const index = search.create({ items: catalog.searchDocuments, siteId });
  const route = { content: product, path: `/${slug}`, type: "product" };
  const rendering = createSharedRenderingContext({ commerce: catalog, content: product, route, routing: routePolicy, site: { siteId, url }, siteId });
  const seo = createAdvancedSeoService({ routePolicy, site: { siteId, url }, siteId }).compose({ content: product, route });
  return { catalog, index, performance: createPerformanceService({ siteId }), rendering, search, seo };
}

function createCustomerRuntime(siteId, orders, performanceService) {
  return createCommerceRuntime({
    accountLookup: async ({ userId }) => ({ addresses: {}, orders: [], user: { email: "anh@example.com", id: userId, name: "Anh Tien" } }),
    authLogin: async () => ({ user: { email: "anh@example.com", id: 101, name: "Anh Tien" } }),
    checkoutProxy: async (request) => { orders.push(request); return { orderId: 9001, status: 201 }; },
    performanceService,
    resolveCartItems: async ({ items }) => items.map((item) => ({ ...item, currency: "VND", inStock: true, price: 120000 })),
    resolveForm: async ({ formId }) => ({ fields: [{ id: "name", required: true }, { id: "email", required: true, type: "email" }, { id: "message", required: true }], id: formId, name: "Contact" }),
    siteId,
    submitForm: async () => ({ id: "submission-1", ok: true })
  });
}

async function api(runtime, pathname, body, cookie = null, method = "POST") {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  const request = new Request(`http://runtime.local${pathname}`, { body: body === null ? undefined : JSON.stringify(body), headers, method });
  const response = await runtime.handle(request);
  return { body: await response.json(), cookie: response.headers.get("set-cookie") ?? cookie, status: response.status };
}
