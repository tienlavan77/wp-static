import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeContentReader from "../framework/src/runtime/source/createRuntimeContentReader.js";

test("Runtime Content Reader preserves source collections for Builder V1 archives and menus", async () => {
  const reader = createRuntimeContentReader({
    adapterLoader: {
      load: () => ({
        getCollections: async () => ({ menus: [{ id: "primary" }], terms: [{ id: 8, slug: "cards", taxonomy: "product_cat" }] }),
        getContents: async () => [{ id: "product-1", slug: "product", type: "product" }],
        initialize: async () => ({ ok: true })
      })
    },
    repository: { readSourceMetadata: async () => ({ endpoint: "https://example.test", sourceType: "wordpress" }) }
  });

  const result = await reader.read({ siteId: "company-a" });
  assert.equal(result.items[0].id, "product-1");
  assert.equal(result.collections.menus[0].id, "primary");
  assert.equal(result.collections.terms[0].slug, "cards");
});

test("Runtime Content Reader uses a matching published snapshot for a targeted Product refresh", async () => {
  const calls = [];
  const reader = createRuntimeContentReader({
    adapterLoader: { load: () => ({
      getContents: async () => { calls.push("full"); return []; },
      getContentsByChanges: async (changes) => { calls.push(changes.map((change) => change.raw)); return [{ id: "product-1", slug: "product-one", title: "Fresh", type: "product" }]; },
      initialize: async () => ({ ok: true })
    }) },
    repository: { readSourceMetadata: async () => ({ endpoint: "https://example.test", sourceType: "wordpress" }) }
  });
  const result = await reader.read({
    changed: ["product:product-one"],
    dependencyManifest: { buildId: "build-1" },
    siteId: "company-a",
    sourceSnapshot: { buildId: "build-1", collections: { terms: [] }, items: [{ id: "product-1", slug: "product-one", title: "Old", type: "product" }] }
  });

  assert.equal(result.mode, "targeted");
  assert.equal(result.items[0].title, "Fresh");
  assert.deepEqual(calls, [["product:product-one"]]);
});

test("Runtime Content Reader falls back to a full read when targeted source data is incomplete", async () => {
  const reader = createRuntimeContentReader({
    adapterLoader: { load: () => ({
      getCollections: async () => ({ terms: [] }),
      getContents: async () => [{ id: "product-1", slug: "product-one", type: "product" }],
      getContentsByChanges: async () => [],
      initialize: async () => ({ ok: true })
    }) },
    repository: { readSourceMetadata: async () => ({ endpoint: "https://example.test", sourceType: "wordpress" }) }
  });
  const result = await reader.read({ changed: ["product:product-one"], dependencyManifest: { buildId: "old" }, siteId: "company-a", sourceSnapshot: { buildId: "old", collections: {}, items: [] } });
  assert.equal(result.mode, "full");
});
