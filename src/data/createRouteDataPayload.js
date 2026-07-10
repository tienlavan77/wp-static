import createSeoMetadata from "../seo/createSeoMetadata.js";
import createTaxonomyBreadcrumbs from "../taxonomy/createTaxonomyBreadcrumbs.js";
import { createFragmentPublicPath } from "../fragments/writeFragmentOutputs.js";

export default function createRouteDataPayload(route, context = {}) {
  const content = route.content;
  const data = content.data ?? {};
  const site = context.site ?? {};

  return {
    schemaVersion: 1,
    kind: "route",
    route: {
      path: route.path,
      outputPath: route.outputPath,
      type: route.type ?? "content",
      contentId: content.id
    },
    site: {
      description: site.description ?? null,
      title: site.title ?? null,
      url: site.url ?? null
    },
    content: {
      id: content.id,
      type: content.type,
      domain: content.domain,
      slug: content.slug,
      status: content.status,
      title: content.title,
      excerpt: data.excerpt ?? data.shortDescription ?? "",
      content: data.content ?? data.description ?? "",
      data,
      acf: data.acf ?? {},
      seo: content.seo ?? {},
      media: createMediaPayload(data),
      taxonomies: createTaxonomyPayload(data),
      commerce: createCommercePayload(content),
      variants: data.variants ?? [],
      relations: createRelationsPayload(content)
    },
    graph: createGraphPayload(content, context.graph),
    seo: createSeoMetadata(content, route, {
      site
    }),
    assets: {
      images: collectImages(data),
      theme: []
    },
    runtime: {
      dataUrl: createRouteDataPublicPath(route),
      fragmentUrl: createFragmentPublicPath(route),
      addToCartEndpoint: "/api/cart/items",
      checkoutEndpoint: "/api/checkout"
    }
  };
}

export function createRouteDataPublicPath(route) {
  return `/data/routes/${createRouteDataFilename(route)}`;
}

export function createRouteDataFilename(route) {
  if (route.path === "/") {
    return "index.json";
  }

  return `${route.path.replace(/^\/+|\/+$/g, "").replaceAll("/", "__")}.json`;
}

function createMediaPayload(data) {
  return {
    featuredImage: data.featuredImage ?? null,
    gallery: data.images ?? []
  };
}

function createTaxonomyPayload(data) {
  return {
    categories: data.categories ?? [],
    tags: data.tags ?? [],
    terms: data.terms ?? []
  };
}

function createCommercePayload(content) {
  const data = content.data ?? {};

  if (content.type !== "product") {
    return null;
  }

  return {
    sku: data.sku ?? "",
    price: data.price ?? null,
    regularPrice: data.regularPrice ?? null,
    salePrice: data.salePrice ?? null,
    currency: data.currency ?? "VND",
    inStock: data.inStock ?? null,
    stockQuantity: data.stockQuantity ?? null,
    manageStock: data.manageStock ?? false,
    averageRating: data.averageRating ?? null,
    reviewCount: data.reviewCount ?? null,
    purchasable: data.purchasable ?? true,
    onSale: isOnSale(data),
    type: Array.isArray(data.variants) && data.variants.length > 0 ? "variable" : "simple"
  };
}

function createRelationsPayload(content) {
  const data = content.data ?? {};

  return {
    parentId: data.parentProductId ?? null,
    relatedProductIds: data.relatedProductIds ?? [],
    upsellIds: data.upsellIds ?? [],
    crossSellIds: data.crossSellIds ?? []
  };
}

function createGraphPayload(content, graph) {
  if (!graph) {
    return {
      breadcrumbs: [],
      menus: [],
      related: [],
      terms: []
    };
  }

  return {
    breadcrumbs: createTaxonomyBreadcrumbs(content, graph),
    menus: graph.menus?.items ?? [],
    related: (content.data?.relatedProductIds ?? [])
      .map((id) => graph.findContentById?.(id))
      .filter(Boolean)
      .map(toContentSummary),
    terms: graph.terms?.items ?? []
  };
}

function toContentSummary(content) {
  return {
    id: content.id,
    slug: content.slug,
    title: content.title,
    type: content.type
  };
}

function collectImages(data) {
  return [
    data.featuredImage,
    ...(data.images ?? []),
    ...(data.variants ?? []).map((variant) => variant.featuredImage ?? variant.image)
  ].filter(Boolean);
}

function isOnSale(data) {
  const salePrice = data.salePrice;
  const regularPrice = data.regularPrice ?? data.price;

  return typeof salePrice === "number" && typeof regularPrice === "number" && salePrice < regularPrice;
}
