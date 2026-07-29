import assert from "node:assert/strict";
import test from "node:test";
import createRuntimeContentReader from "../src/source/createRuntimeContentReader.js";

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
