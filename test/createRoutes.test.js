import assert from "node:assert/strict";
import test from "node:test";
import createContent from "../framework/src/core/createContent.js";
import createRoutes from "../framework/src/builder/router/createRoutes.js";

test("createRoutes maps homepage and normal slugs", () => {
  const routes = createRoutes([
    content("page-home", "home"),
    content("product-iphone-15", "iphone-15")
  ], { homepage: "home" });

  assert.equal(routes[0].path, "/");
  assert.equal(routes[0].outputPath, "index.html");
  assert.equal(routes[1].path, "/iphone-15");
  assert.equal(routes[1].outputPath, "iphone-15.html");
});

test("createRoutes fails on duplicate route paths", () => {
  assert.throws(
    () => createRoutes([
      content("product-iphone-15", "iphone-15"),
      content("page-iphone-15", "iphone-15")
    ]),
    /Duplicate route "\/iphone-15" for content "product-iphone-15" and "page-iphone-15"\./
  );
});

function content(id, slug) {
  return createContent({
    id,
    type: "page",
    title: id,
    slug,
    domain: "shop",
    data: {}
  });
}
