import createSeoMetadata from "../builder/seo/createSeoMetadata.js";
import generateSitemap from "../builder/seo/generateSitemap.js";
import deepFreeze from "../shared/deepFreeze.js";

export const ADVANCED_SEO_SCHEMA = "wpsc.advanced-seo";
export const ADVANCED_SEO_VERSION = 1;

// Provider SEO is normalized here, while paths remain exclusively owned by Site Route Policy.
export default function createAdvancedSeoService(options = {}) {
  const routePolicy = options.routePolicy;
  const site = options.site ?? {};
  const siteId = String(options.siteId ?? routePolicy?.siteId ?? site.siteId ?? site.id ?? "").trim();
  if (!siteId) throw new TypeError("Advanced SEO Service requires a Site id.");
  if (!routePolicy || typeof routePolicy.createCanonical !== "function") throw new TypeError("Advanced SEO Service requires a Site Route Policy.");

  function compose(input = {}) {
    const content = input.content ?? {};
    const route = input.route ?? {};
    const canonical = routePolicy.createCanonical(route.path);
    const structuredData = createStructuredData(content, canonical);
    const metadata = createSeoMetadata(content, route, { canonical, site, structuredData });
    const pagination = createPagination(input.pagination, routePolicy);
    return deepFreeze({
      metadata: { ...metadata, pagination },
      schema: ADVANCED_SEO_SCHEMA,
      schemaVersion: ADVANCED_SEO_VERSION,
      siteId
    });
  }

  function sitemap(sitePlan) {
    return generateSitemap(sitePlan, { routePolicy, site });
  }

  return Object.freeze({ compose, schema: ADVANCED_SEO_SCHEMA, schemaVersion: ADVANCED_SEO_VERSION, siteId, sitemap });
}

function createStructuredData(content, canonical) {
  const base = { "@context": "https://schema.org", "@type": "WebPage", headline: content.title ?? "", url: canonical };
  if (content.type !== "product") return [base];
  const product = content.data?.product ?? content.data?.commerce ?? content.data ?? {};
  const price = product.price ?? product.regularPrice ?? null;
  const currency = product.currency ?? "VND";
  return [{
    "@context": "https://schema.org",
    "@type": "Product",
    name: content.title ?? "",
    offers: price === null ? undefined : { "@type": "Offer", availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", price: String(price), priceCurrency: currency, url: canonical },
    url: canonical
  }];
}

function createPagination(pagination, routePolicy) {
  if (!pagination) return { next: null, previous: null };
  return {
    next: pagination.nextPath ? routePolicy.createCanonical(pagination.nextPath) : null,
    previous: pagination.previousPath ? routePolicy.createCanonical(pagination.previousPath) : null
  };
}
