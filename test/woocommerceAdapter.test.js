import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import normalizeWooCommerceProduct from "../framework/src/adapters/woocommerce/normalizeWooCommerceProduct.js";
import createContent from "../framework/src/core/createContent.js";
import createWooCommerceClient from "../framework/src/adapters/woocommerce/woocommerceClient.js";
import createWooCommerceRepository from "../framework/src/adapters/woocommerce/woocommerceRepository.js";
import createWooCommerceAdapter from "../framework/src/adapters/woocommerce/woocommerceAdapter.js";

test("normalizeWooCommerceProduct maps product data into Content input", async () => {
  const rawProduct = JSON.parse(await readFile("test/fixtures/woocommerce/product-with-rankmath.json", "utf8"));
  const content = normalizeWooCommerceProduct(rawProduct);

  assert.equal(content.id, "product-44");
  assert.equal(content.data.woocommerceProductId, "44");
  assert.equal(content.type, "product");
  assert.equal(content.title, "Áo thun basic");
  assert.equal(content.data.price, 249000);
  assert.equal(content.data.regularPrice, 299000);
  assert.equal(content.data.salePrice, 249000);
  assert.equal(content.data.inStock, true);
  assert.equal(content.data.categories[0].slug, "thoi-trang");
  assert.deepEqual(content.data.terms.map((term) => `${term.taxonomy}:${term.slug}`), [
    "product_cat:thoi-trang",
    "product_tag:basic"
  ]);
  assert.equal(content.data.featuredImage.sourceUrl, "https://example.com/ao.jpg");
  assert.equal(content.data.acf.material, "Cotton");
  assert.equal(content.seo.title, "SEO Product Title");
  assert.equal(content.seo.openGraph.image, "https://example.com/og-product.jpg");
});

test("normalizeWooCommerceProduct maps variations into variants", () => {
  const content = normalizeWooCommerceProduct({
    id: 44,
    name: "Hộp giấy",
    slug: "hop-giay",
    price: "100000",
    categories: [],
    tags: [],
    images: [],
    variations: [{
      id: 501,
      attributes: [{
        id: 1,
        name: "Kích thước",
        option: "10 x 20 cm",
        slug: "kich-thuoc"
      }],
      image: {
        id: 9,
        src: "https://example.com/variant.jpg",
        name: "Variant",
        alt: "Variant image"
      },
      price: "120000",
      regular_price: "150000",
      sale_price: "120000",
      sku: "BOX-10-20",
      stock_status: "instock",
      stock_quantity: 7
    }]
  });

  assert.equal(content.data.variants[0].id, 501);
  assert.equal(content.data.variants[0].name, "10 x 20 cm");
  assert.equal(content.data.variants[0].slug, "box-10-20");
  assert.equal(content.data.variants[0].price, 120000);
  assert.equal(content.data.variants[0].featuredImage.sourceUrl, "https://example.com/variant.jpg");
});

test("normalizeWooCommerceProduct converts missing optional API fields into JSON-safe data", () => {
  const content = normalizeWooCommerceProduct({
    categories: [{}],
    id: 42,
    images: [{}],
    name: "Optional fields",
    slug: "optional-fields",
    tags: [],
    variations: [{ attributes: [{}], image: {} }]
  });
  assert.doesNotThrow(() => createContent(content));
});

test("WooCommerce client fetches paginated collections with credentials", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const page = new URL(String(url)).searchParams.get("page");

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "2"
      }),
      async json() {
        return [{ id: Number(page) }];
      }
    };
  };
  const client = createWooCommerceClient({
    baseUrl: "https://example.com",
    consumerKey: "ck_test",
    consumerSecret: "cs_test",
    fetchImpl
  });
  const items = await client.getCollection("/wp-json/wc/v3/products");

  assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
  assert.match(urls[0], /consumer_key=ck_test/);
  assert.match(urls[0], /consumer_secret=cs_test/);
});

test("WooCommerce client reads credentials from env names", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));

    return {
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async json() {
        return [];
      }
    };
  };
  const client = createWooCommerceClient({
    baseUrl: "https://example.com",
    consumerKeyEnv: "WOO_KEY",
    consumerSecretEnv: "WOO_SECRET",
    env: {
      WOO_KEY: "ck_env",
      WOO_SECRET: "cs_env"
    },
    fetchImpl
  });

  await client.getCollection("/wp-json/wc/v3/products");

  assert.match(urls[0], /consumer_key=ck_env/);
  assert.match(urls[0], /consumer_secret=cs_env/);
});

test("WooCommerce client tolerates PHP warnings before JSON", async () => {
  const client = createWooCommerceClient({
    baseUrl: "https://example.com",
    fetchImpl: async () => ({
      ok: true,
      headers: new Headers({
        "x-wp-totalpages": "1"
      }),
      async text() {
        return '<br />\n<b>Warning</b>: plugin warning<br />\n[{"id":5,"name":"Cat"}]';
      }
    })
  });
  const items = await client.getCollection("/wp-json/wc/v3/products/categories");

  assert.deepEqual(items, [{ id: 5, name: "Cat" }]);
});

test("WooCommerce client preserves provider diagnostics for failed requests", async () => {
  const client = createWooCommerceClient({
    baseUrl: "https://shop.example.test",
    consumerKey: "ck_test",
    consumerSecret: "cs_test",
    fetchImpl: async () => new Response(JSON.stringify({
      code: "woocommerce_rest_invalid_product_id",
      message: "Product is invalid."
    }), { status: 400, statusText: "Bad Request" })
  });

  await assert.rejects(
    () => client.createResource("/wp-json/wc/v3/orders", { line_items: [] }),
    (error) => error.status === 400
      && error.providerCode === "woocommerce_rest_invalid_product_id"
      && error.message.includes("Product is invalid.")
  );
});

test("WooCommerce repository fetches products and variations", async () => {
  const calls = [];
  const client = {
    async getCollection(pathname) {
      calls.push(pathname);

      if (pathname === "/wp-json/wc/v3/products") {
        return [{
          id: 44,
          name: "Áo thun",
          slug: "ao-thun",
          price: "249000",
          categories: [],
          tags: [],
          images: []
        }];
      }

      return [{ id: 99, regular_price: "299000" }];
    }
  };
  const repository = createWooCommerceRepository(client, {
    includeVariations: true
  });
  const contents = await repository.getContents();

  assert.deepEqual(calls, [
    "/wp-json/wc/v3/products",
    "/wp-json/wc/v3/products/44/variations"
  ]);
  assert.equal(contents[0].data.variations[0].id, 99);
});

test("createWooCommerceAdapter requires baseUrl", () => {
  assert.throws(
    () => createWooCommerceAdapter(),
    /WooCommerce adapter option "baseUrl" is required/
  );
});
