import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import addRelatedProducts from "../src/commerce/addRelatedProducts.js";
import applyAdvancedCommerceData from "../src/commerce/applyAdvancedCommerceData.js";
import createCommerceCollections from "../src/commerce/createCommerceCollections.js";
import createProductVariantContents from "../src/commerce/createProductVariantContents.js";
import createContent from "../src/core/createContent.js";
import compile from "../src/core/compile.js";
import loadConfig from "../src/core/loadConfig.js";

test("createProductVariantContents creates slug-only variant pages", () => {
  const variants = createProductVariantContents([product("product-phone", "phone", {
    variants: [{
      name: "Black 128GB",
      price: 100,
      slug: "black-128gb"
    }]
  })]);

  assert.equal(variants[0].type, "product_variant");
  assert.equal(variants[0].slug, "phone-black-128gb");
  assert.equal(variants[0].data.parentProductSlug, "phone");
});

test("createProductVariantContents supports WooCommerce variations alias", () => {
  const variants = createProductVariantContents([product("product-box", "box", {
    variations: [{
      name: "Large",
      price: 200,
      sku: "BOX-L"
    }]
  })]);

  assert.equal(variants[0].slug, "box-box-l");
  assert.equal(variants[0].data.price, 200);
});

test("createProductVariantContents ignores WooCommerce variation id references", () => {
  const variants = createProductVariantContents([product("product-box", "box", {
    variations: [501, 502]
  })]);

  assert.deepEqual(variants, []);
});

test("createProductVariantContents dedupes repeated WooCommerce variations", () => {
  const variants = createProductVariantContents([product("product-box", "box", {
    variants: [
      { id: 501, sku: "BOX-L", price: 200 },
      { id: 502, sku: "BOX-L", price: 200 }
    ]
  })]);

  assert.equal(variants.length, 1);
  assert.equal(variants[0].slug, "box-box-l");
});

test("createCommerceCollections returns sale and stock filters", () => {
  const collections = createCommerceCollections([
    product("product-sale", "sale", {
      inStock: true,
      price: 100,
      salePrice: 80
    }),
    product("product-empty", "empty", {
      inStock: false,
      price: 50
    })
  ]);

  assert.deepEqual(collections.products.onSale.map((item) => item.slug), ["sale"]);
  assert.deepEqual(collections.products.inStock.map((item) => item.slug), ["sale"]);
  assert.deepEqual(collections.products.outOfStock.map((item) => item.slug), ["empty"]);
});

test("addRelatedProducts generates related product ids from matching terms", () => {
  const contents = addRelatedProducts([
    product("product-phone", "phone", {
      terms: [term("dien-thoai")]
    }),
    product("product-case", "case", {
      terms: [term("dien-thoai")]
    }),
    product("product-shirt", "shirt", {
      terms: [term("thoi-trang")]
    })
  ]);

  assert.deepEqual(contents[0].data.relatedProductIds, ["product-case"]);
});

test("applyAdvancedCommerceData keeps variants on parent products", () => {
  const data = applyAdvancedCommerceData({
    contents: [
      product("product-phone", "phone", {
        inStock: true,
        price: 100,
        salePrice: 80,
        terms: [term("dien-thoai")],
        variants: [{
          slug: "black",
          price: 90
        }]
      }),
      product("product-case", "case", {
        inStock: true,
        price: 20,
        terms: [term("dien-thoai")]
      })
    ]
  });

  assert.equal(data.contents.some((content) => content.slug === "phone-black"), false);
  assert.deepEqual(data.collections.commerce.products.onSale.map((item) => item.slug), ["phone"]);
  assert.equal(data.contents.find((content) => content.id === "product-phone").data.variants[0].slug, "black");
  assert.deepEqual(data.contents.find((content) => content.id === "product-phone").data.relatedProductIds, ["product-case"]);
});

test("compile keeps product variants on parent product data", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-advanced-commerce-"));
  const config = await loadConfig("examples/basic-shop");
  const testConfig = {
    ...config,
    _paths: {
      ...config._paths,
      outputDir
    },
    outputDir
  };
  const sitePlan = await compile(testConfig, {
    cacheBust: Date.now(),
    cacheDir: path.join(outputDir, ".wpsc", "cache"),
    projectDir: config._paths.projectDir
  });

  assert.equal(sitePlan.routes.some((route) => route.path === "/iphone-15-128gb-den"), false);
  assert.equal(sitePlan.routes.filter((route) => route.path !== "/").some((route) => route.path.endsWith("/")), false);
  assert.equal(sitePlan.graph.findContentBySlug("iphone-15").data.variants.length, 2);
  assert.equal(sitePlan.graph.contents.items.some((content) => content.type === "product_variant"), false);
});

function product(id, slug, data = {}) {
  return createContent({
    data: {
      price: 100,
      ...data
    },
    domain: "shop",
    id,
    slug,
    title: id,
    type: "product"
  });
}

function term(slug) {
  return {
    id: `product_cat:${slug}`,
    name: slug,
    slug,
    taxonomy: "product_cat"
  };
}
