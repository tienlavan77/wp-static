import assert from "node:assert/strict";
import test from "node:test";
import createContent from "../framework/src/core/createContent.js";
import createContentGraph from "../framework/src/builder/content/createContentGraph.js";
import createRouteDataPayload from "../framework/src/builder/data/createRouteDataPayload.js";
import createArchiveRoutes from "../framework/src/builder/router/createArchiveRoutes.js";

test("route data exposes hierarchical breadcrumbs while keeping flat archive URLs", () => {
  const parentTerm = term(10, "bao-bi", "Bao bì", "product_cat");
  const childTerm = term(11, "hop-giay", "Hộp giấy", "product_cat", 10);
  const product = createContent({
    data: {
      terms: [childTerm]
    },
    domain: "shop",
    id: "product-hop",
    slug: "hop-nap-cai",
    title: "Hộp nắp cài",
    type: "product"
  });
  const graph = createContentGraph({
    contents: [product],
    terms: [parentTerm, childTerm]
  });
  const archive = createArchiveRoutes([product], graph.terms.items)
    .find((route) => route.path === "/hop-giay");
  const archivePayload = createRouteDataPayload(archive, { graph });
  const productPayload = createRouteDataPayload({
    content: product,
    outputPath: "hop-nap-cai.html",
    path: "/hop-nap-cai",
    type: "content"
  }, { graph });

  assert.equal(archive.path, "/hop-giay");
  assert.deepEqual(archivePayload.graph.breadcrumbs.map((item) => item.slug), [
    "bao-bi",
    "hop-giay"
  ]);
  assert.deepEqual(productPayload.graph.breadcrumbs.map((item) => item.slug), [
    "bao-bi",
    "hop-giay",
    "hop-nap-cai"
  ]);
  assert.equal(productPayload.graph.breadcrumbs[0].path, "/bao-bi");
});

test("WordPress post breadcrumbs use category parent metadata", () => {
  const parentTerm = term(20, "tin-tuc", "Tin tức", "category");
  const childTerm = term(21, "in-an", "In ấn", "category", 20);
  const post = createContent({
    data: {
      terms: [childTerm]
    },
    domain: "blog",
    id: "post-1",
    slug: "kinh-nghiem-in-hop",
    title: "Kinh nghiệm in hộp",
    type: "post"
  });
  const graph = createContentGraph({
    contents: [post],
    terms: [parentTerm, childTerm]
  });
  const payload = createRouteDataPayload({
    content: post,
    outputPath: "kinh-nghiem-in-hop.html",
    path: "/kinh-nghiem-in-hop",
    type: "content"
  }, { graph });

  assert.deepEqual(payload.graph.breadcrumbs.map((item) => item.slug), [
    "tin-tuc",
    "in-an",
    "kinh-nghiem-in-hop"
  ]);
});

function term(id, slug, name, taxonomy, parentId = null) {
  return {
    id,
    name,
    parentId,
    slug,
    taxonomy
  };
}
