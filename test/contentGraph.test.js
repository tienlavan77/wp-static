import assert from "node:assert/strict";
import test from "node:test";
import createContent from "../src/core/createContent.js";
import createContentGraph from "../src/content/createContentGraph.js";

test("createContentGraph indexes content by id, slug, type, and term", () => {
  const product = createContent({
    id: "product-ao-thun",
    type: "product",
    title: "Áo thun",
    slug: "ao-thun",
    domain: "test",
    data: {
      featuredImage: {
        id: 11,
        sourceUrl: "https://example.com/ao.jpg",
        alt: "Áo"
      },
      terms: [{
        count: 8,
        description: "Sản phẩm thời trang",
        id: 7,
        image: {
          alt: "Ảnh thời trang",
          sourceUrl: "https://example.com/thoi-trang.jpg"
        },
        menuOrder: 2,
        name: "Thời trang",
        slug: "thoi-trang",
        taxonomy: "product_cat"
      }]
    }
  });
  const page = createContent({
    id: "page-home",
    type: "page",
    title: "Home",
    slug: "home",
    domain: "test",
    data: {}
  });
  const graph = createContentGraph({
    contents: [product, page],
    menus: [{
      id: 1,
      name: "Primary",
      slug: "primary",
      items: [{ label: "Home", url: "/" }]
    }]
  });

  assert.equal(graph.findContentById("product-ao-thun").slug, "ao-thun");
  assert.equal(graph.findContentBySlug("home").id, "page-home");
  assert.equal(graph.findContentsByType("product").length, 1);
  assert.equal(graph.findContentsByTerm("thoi-trang")[0].id, "product-ao-thun");
  assert.equal(graph.terms.bySlug["thoi-trang"].taxonomy, "product_cat");
  assert.equal(graph.terms.bySlug["thoi-trang"].description, "Sản phẩm thời trang");
  assert.equal(graph.terms.bySlug["thoi-trang"].image.sourceUrl, "https://example.com/thoi-trang.jpg");
  assert.equal(graph.terms.bySlug["thoi-trang"].count, 8);
  assert.equal(graph.terms.bySlug["thoi-trang"].menuOrder, 2);
  assert.equal(graph.media.byId["11"].sourceUrl, "https://example.com/ao.jpg");
  assert.equal(graph.menus.bySlug.primary.name, "Primary");
  assert.equal(Object.isFrozen(graph.contents.items), true);
});

test("compiled site plan includes a content graph", async () => {
  const { default: compile } = await import("../src/core/compile.js");
  const { default: loadConfig } = await import("../src/core/loadConfig.js");
  const config = await loadConfig("examples/basic-shop");
  const sitePlan = await compile(config);

  assert.equal(sitePlan.graph.findContentBySlug("iphone-15").id, "product-iphone-15");
  assert.equal(sitePlan.graph.findContentsByType("product").length, 2);
});
