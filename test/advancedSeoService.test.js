import assert from "node:assert/strict";
import test from "node:test";
import createAdvancedSeoService from "../framework/src/seo/createAdvancedSeoService.js";
import createSiteRoutePolicy from "../framework/src/routing/createSiteRoutePolicy.js";
import renderSeoTags from "../framework/src/builder/seo/renderSeoTags.js";

function service() {
  return createAdvancedSeoService({
    routePolicy: createSiteRoutePolicy({ siteId: "site-a", siteUrl: "https://shop.example.test" }),
    site: { title: "Shop", url: "https://shop.example.test" },
    siteId: "site-a"
  });
}

test("Advanced SEO normalizes commerce metadata through Site Route Policy", () => {
  const result = service().compose({
    content: {
      data: { commerce: { currency: "VND", inStock: true, price: 120000 } },
      seo: { canonical: "https://provider.example.test/wrong", description: "Provider description" },
      title: "Danh thiep cao cap",
      type: "product"
    },
    pagination: { nextPath: "/products/page/2", previousPath: "/products" },
    route: { path: "/products/danh-thiep" }
  });

  assert.equal(result.siteId, "site-a");
  assert.equal(result.metadata.canonical, "https://shop.example.test/products/danh-thiep");
  assert.equal(result.metadata.openGraph.url, result.metadata.canonical);
  assert.equal(result.metadata.structuredData[0]["@type"], "Product");
  assert.equal(result.metadata.structuredData[0].offers.price, "120000");
  assert.deepEqual(result.metadata.pagination, {
    next: "https://shop.example.test/products/page/2",
    previous: "https://shop.example.test/products"
  });
  assert.equal(Object.isFrozen(result), true);
});

test("Advanced SEO sitemap is deterministic, route-policy based and omits noindex", () => {
  const sitemap = service().sitemap({
    pages: [
      { route: { content: { seo: { robots: ["noindex"] } }, path: "/private" } },
      { route: { path: "/b" } },
      { route: { path: "/" } },
      { route: { path: "/b" } }
    ]
  });

  assert.match(sitemap, /<loc>https:\/\/shop.example.test\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/shop.example.test\/b<\/loc>/);
  assert.doesNotMatch(sitemap, /private/);
  assert.equal((sitemap.match(/shop.example.test\/b/g) ?? []).length, 1);
});

test("SEO tags render deterministic Product structured data", () => {
  const seo = service().compose({ content: { data: { commerce: { price: 100 } }, title: "Product", type: "product" }, route: { path: "/product" } });
  const tags = renderSeoTags({}, {}, { metadata: seo.metadata });
  assert.match(tags, /application\/ld\+json/);
  assert.match(tags, /"@type":"Product"/);
});
