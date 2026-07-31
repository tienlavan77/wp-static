import assert from "node:assert/strict";
import test from "node:test";
import compilePreparedSite from "../framework/src/core/compilePreparedSite.js";
import createSharedStorefrontBuildConfig from "../framework/src/runtime/build/createSharedStorefrontBuildConfig.js";

test("prepared Runtime content uses Builder V1 routes to select page, product, archive, and system layouts", async () => {
  const plan = await compilePreparedSite({
    config: createSharedStorefrontBuildConfig(),
    contents: [
      { data: { content: "<p>Welcome</p>" }, id: "home", slug: "homepage", status: "publish", title: "Home", type: "page" },
      {
        data: { terms: [{ id: 9, name: "Cards", slug: "cards", taxonomy: "product_cat" }] },
        id: "product-1",
        slug: "product-one",
        status: "publish",
        title: "Product one",
        type: "product"
      }
    ]
  });

  const pageByPath = new Map(plan.pages.map((page) => [page.route.path, page.html]));
  assert.match(pageByPath.get("/"), /storefront-category-overview/);
  assert.match(pageByPath.get("/product-one"), /storefront-product-detail/);
  assert.match(pageByPath.get("/cards"), /storefront-archive/);
  assert.match(pageByPath.get("/account"), /storefront-account-page/);
  assert.match(pageByPath.get("/404"), /storefront-not-found/);
  assert.match(pageByPath.get("/search"), /storefront-search-page/);
  assert.deepEqual(
    plan.routes.map((route) => [route.path, route.content.type]),
    [["/", "page"], ["/product-one", "product"], ["/account", "account"], ["/404", "page"], ["/search", "search"], ["/cards", "archive:product_cat"]]
  );
});
