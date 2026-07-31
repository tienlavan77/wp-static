import assert from "node:assert/strict";
import test from "node:test";
import createCommerceCatalogService from "../framework/src/commerce/createCommerceCatalogService.js";
import createCommerceProviderContract from "../framework/src/commerce/createCommerceProviderContract.js";
import createSearchService from "../framework/src/search/createSearchService.js";
import createSharedRenderingContext from "../framework/src/theme/createSharedRenderingContext.js";

function contract(siteId = "site-a") {
  return createCommerceProviderContract({
    attributes: [{ id: 3, name: "Kích thước", slug: "pa_kich-thuoc" }],
    categories: [{ count: 1, id: 7, name: "Hộp giấy", slug: "hop-giay" }],
    products: [{
      data: {
        featuredImage: { alt: "Hộp giấy", id: 21, sourceUrl: "https://cms.example.test/hop.jpg" },
        images: [
          { alt: "Hộp giấy", id: 21, sourceUrl: "https://cms.example.test/hop.jpg" },
          { alt: "Mặt sau", id: 22, sourceUrl: "https://cms.example.test/hop-sau.jpg" }
        ],
        price: 120000,
        terms: [{ id: 7, name: "Hộp giấy", slug: "hop-giay", taxonomy: "product_cat" }],
        variants: [{
          featuredImage: { alt: "Hộp lớn", id: 23, sourceUrl: "https://cms.example.test/hop-lon.jpg" },
          id: 501,
          name: "20 x 30 cm",
          price: 150000,
          slug: "hop-giay-20-30"
        }]
      },
      domain: "woocommerce",
      id: "product-44",
      slug: "hop-giay-cao-cap",
      status: "publish",
      title: "Hộp giấy cao cấp",
      type: "product"
    }],
    siteId,
    store: [{ id: "woocommerce_currency", value: "VND" }],
    tags: [{ count: 1, id: 9, name: "In offset", slug: "in-offset" }]
  });
}

test("Commerce Catalog composes deterministic routes, media, search, and variations", () => {
  const service = createCommerceCatalogService({
    site: { siteId: "site-a", url: "https://shop.example.test" },
    siteId: "site-a"
  });
  const catalog = service.compose(contract());

  assert.equal(catalog.schema, "wpsc.commerce-catalog");
  assert.equal(catalog.siteId, "site-a");
  assert.deepEqual(catalog.productRoutes, [{
    canonical: "https://shop.example.test/hop-giay-cao-cap",
    contentId: "product-44",
    path: "/hop-giay-cao-cap",
    type: "product"
  }]);
  assert.deepEqual(catalog.archiveRoutes.map((route) => `${route.taxonomy}:${route.path}`), [
    "product_cat:/hop-giay",
    "product_tag:/in-offset"
  ]);
  assert.equal(catalog.products[0].data.variants[0].id, 501);
  assert.deepEqual(catalog.media.map((item) => String(item.id)), ["21", "22", "23"]);
  assert.equal(catalog.searchDocuments[0].categories[0], "Hộp giấy");
  assert.equal(Object.isFrozen(catalog), true);
});

test("Commerce search documents use the shared Site Search Service", () => {
  const catalog = createCommerceCatalogService({ siteId: "site-a" }).compose(contract());
  const search = createSearchService({ siteId: "site-a" });
  const index = search.create({ items: catalog.searchDocuments, siteId: catalog.siteId });
  const result = search.query(index, { query: "hop giay", siteId: "site-a" });

  assert.equal(index.siteId, "site-a");
  assert.equal(result.total, 1);
  assert.equal(result.results[0].id, "product-44");
});

test("Theme receives catalog through Rendering Context without provider access", () => {
  const catalog = createCommerceCatalogService({ siteId: "site-a" }).compose(contract());
  const context = createSharedRenderingContext({
    commerce: catalog,
    content: catalog.products[0],
    route: { content: catalog.products[0], path: "/hop-giay-cao-cap" },
    site: { siteId: "site-a" }
  });

  assert.equal(context.commerce.schema, "wpsc.commerce-catalog");
  assert.equal(context.commerce.products[0].data.variants[0].name, "20 x 30 cm");
  assert.equal(Object.hasOwn(context, "woocommerce"), false);
  assert.equal(Object.hasOwn(context, "source"), false);
});

test("Commerce Catalog rejects a provider contract belonging to another Site", () => {
  const service = createCommerceCatalogService({ siteId: "site-a" });
  assert.throws(() => service.compose(contract("site-b")), /Site mismatch/);
});
