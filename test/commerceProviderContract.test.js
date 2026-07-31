import assert from "node:assert/strict";
import test from "node:test";
import createWooCommerceAdapter from "../framework/src/adapters/woocommerce/woocommerceAdapter.js";
import createCommerceProviderContract, {
  COMMERCE_PROVIDER_SCHEMA,
  COMMERCE_PROVIDER_VERSION
} from "../framework/src/commerce/createCommerceProviderContract.js";

function product() {
  return {
    data: {
      categories: [],
      images: [],
      price: 120000,
      tags: [],
      variants: []
    },
    domain: "woocommerce",
    id: "product-44",
    slug: "hop-giay",
    status: "publish",
    title: "Hộp giấy",
    type: "product"
  };
}

test("Commerce Provider Contract is immutable, versioned, normalized, and Site-scoped", () => {
  const contract = createCommerceProviderContract({
    attributes: [{
      has_archives: true,
      id: 3,
      name: "Kích thước",
      order_by: "menu_order",
      slug: "pa_kich-thuoc",
      type: "select"
    }],
    categories: [{
      count: 2,
      description: "Bao bì",
      id: 7,
      image: { alt: "Hộp", id: 21, src: "https://cms.example.test/hop.jpg" },
      name: "Hộp giấy",
      parent: 0,
      slug: "hop-giay"
    }],
    products: [product()],
    siteId: "site-a",
    store: [
      { id: "woocommerce_currency", value: "VND" },
      { id: "woocommerce_currency_pos", value: "right_space" },
      { id: "woocommerce_price_num_decimals", value: "0" }
    ],
    tags: [{ count: 1, id: 9, name: "In offset", slug: "in-offset" }]
  });

  assert.equal(contract.schema, COMMERCE_PROVIDER_SCHEMA);
  assert.equal(contract.schemaVersion, COMMERCE_PROVIDER_VERSION);
  assert.equal(contract.siteId, "site-a");
  assert.equal(contract.provider, "woocommerce");
  assert.equal(contract.products[0].id, "product-44");
  assert.equal(contract.categories[0].taxonomy, "product_cat");
  assert.equal(contract.categories[0].image.sourceUrl, "https://cms.example.test/hop.jpg");
  assert.equal(contract.tags[0].taxonomy, "product_tag");
  assert.equal(contract.attributes[0].hasArchives, true);
  assert.equal(contract.store.currency, "VND");
  assert.equal(contract.store.decimals, 0);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.products), true);
  assert.throws(() => createCommerceProviderContract({ products: [] }), /Site id/);
});

test("Commerce contracts for two Sites cannot share identity or mutable state", () => {
  const siteA = createCommerceProviderContract({ products: [product()], siteId: "site-a" });
  const siteB = createCommerceProviderContract({ products: [product()], siteId: "site-b" });

  assert.notEqual(siteA.siteId, siteB.siteId);
  assert.notEqual(siteA, siteB);
  assert.throws(() => {
    siteA.products.push(product());
  }, TypeError);
  assert.equal(siteB.products.length, 1);
});

test("WooCommerce Adapter composes Products, Attributes, Terms, and Store Configuration", async () => {
  const calls = [];
  const responses = {
    "/wp-json/wc/v3/products": [{
      categories: [],
      id: 44,
      images: [],
      name: "Hộp giấy",
      price: "120000",
      slug: "hop-giay",
      status: "publish",
      tags: [],
      variations: []
    }],
    "/wp-json/wc/v3/products/attributes": [{ id: 3, name: "Kích thước", slug: "pa_kich-thuoc" }],
    "/wp-json/wc/v3/products/categories": [{ count: 1, id: 7, name: "Hộp giấy", slug: "hop-giay" }],
    "/wp-json/wc/v3/products/tags": [{ count: 1, id: 9, name: "In offset", slug: "in-offset" }],
    "/wp-json/wc/v3/settings/general": [{ id: "woocommerce_currency", value: "VND" }]
  };
  const adapter = createWooCommerceAdapter({
    baseUrl: "https://cms.example.test",
    consumerKey: "ck_test",
    consumerSecret: "cs_test",
    fetchImpl: async (input) => {
      const pathname = new URL(String(input)).pathname;
      calls.push(pathname);
      return {
        headers: new Headers({ "x-wp-totalpages": "1" }),
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(responses[pathname] ?? [])
      };
    },
    siteId: "site-a"
  });

  const contract = await adapter.getCommerceContract();

  assert.equal(contract.siteId, "site-a");
  assert.equal(contract.products[0].data.price, 120000);
  assert.equal(contract.attributes[0].slug, "pa_kich-thuoc");
  assert.equal(contract.categories[0].slug, "hop-giay");
  assert.equal(contract.tags[0].slug, "in-offset");
  assert.equal(contract.store.currency, "VND");
  assert.deepEqual(new Set(calls), new Set(Object.keys(responses)));
});
