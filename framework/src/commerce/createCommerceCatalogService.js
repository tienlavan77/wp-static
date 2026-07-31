import deepFreeze from "../shared/deepFreeze.js";
import createSiteRoutePolicy from "../routing/createSiteRoutePolicy.js";
import { COMMERCE_PROVIDER_SCHEMA, COMMERCE_PROVIDER_VERSION } from "./createCommerceProviderContract.js";

export const COMMERCE_CATALOG_SCHEMA = "wpsc.commerce-catalog";
export const COMMERCE_CATALOG_VERSION = 1;

export default function createCommerceCatalogService(options = {}) {
  const siteId = String(options.siteId ?? "").trim();
  if (!siteId) throw new TypeError("Commerce Catalog Service requires a Site id.");
  const routePolicy = options.routingPolicy ?? createSiteRoutePolicy({
    homepage: options.homepage,
    site: options.site,
    siteId,
    siteUrl: options.siteUrl
  });

  function compose(contract) {
    assertContract(contract);
    if (contract.siteId !== siteId) throw new Error(`Commerce catalog Site mismatch: expected "${siteId}", received "${contract.siteId}".`);

    const products = contract.products;
    const productRoutes = products.map((product) => {
      const routePath = routePolicy.resolveContentPath(product);
      return {
        canonical: routePolicy.createCanonical(routePath),
        contentId: product.id,
        path: routePath,
        type: "product"
      };
    });
    const archiveRoutes = [...contract.categories, ...contract.tags].map((term) => ({
      canonical: routePolicy.createCanonical(`/${term.slug}`),
      path: `/${term.slug}`,
      taxonomy: term.taxonomy,
      title: term.name,
      type: `archive:${term.taxonomy}`
    }));

    return deepFreeze({
      archiveRoutes,
      attributes: contract.attributes,
      media: collectMedia(products),
      productRoutes,
      products,
      schema: COMMERCE_CATALOG_SCHEMA,
      schemaVersion: COMMERCE_CATALOG_VERSION,
      searchDocuments: products.map(createSearchDocument),
      siteId,
      store: contract.store,
      taxonomy: {
        categories: contract.categories,
        tags: contract.tags
      }
    });
  }

  return Object.freeze({ compose, schema: COMMERCE_CATALOG_SCHEMA, schemaVersion: COMMERCE_CATALOG_VERSION, siteId });
}

function assertContract(contract) {
  if (!contract || contract.schema !== COMMERCE_PROVIDER_SCHEMA || contract.schemaVersion !== COMMERCE_PROVIDER_VERSION) {
    throw new TypeError("Commerce Catalog Service requires a compatible Commerce Provider Contract.");
  }
}

function collectMedia(products) {
  const media = [];
  for (const product of products) {
    for (const image of [product.data?.featuredImage, ...(product.data?.images ?? [])]) {
      if (image) media.push({ ...image, provider: "woocommerce" });
    }
    for (const variation of product.data?.variants ?? []) {
      if (variation.featuredImage) media.push({ ...variation.featuredImage, provider: "woocommerce" });
    }
  }
  const byId = new Map(media.map((item) => [String(item.id ?? item.sourceUrl), item]));
  return [...byId.values()].sort((first, second) => String(first.id ?? first.sourceUrl).localeCompare(String(second.id ?? second.sourceUrl)));
}

function createSearchDocument(product) {
  const terms = product.data?.terms ?? [];
  return {
    categories: terms.filter((term) => term.taxonomy === "product_cat").map((term) => term.name ?? term.slug),
    id: product.id,
    keywords: [product.title, product.slug, ...terms.map((term) => term.name ?? term.slug)].filter(Boolean),
    slug: product.slug,
    title: product.title,
    type: "product"
  };
}
