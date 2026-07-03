import normalizeRankMathSeo from "../wordpress/normalizeRankMathSeo.js";

export default function normalizeWooCommerceProduct(rawProduct = {}) {
  const slug = rawProduct.slug ?? String(rawProduct.id);

  return {
    id: `product-${rawProduct.id}`,
    type: "product",
    title: stripTags(rawProduct.name ?? slug),
    slug,
    domain: "woocommerce",
    data: {
      acf: rawProduct.acf ?? {},
      averageRating: rawProduct.average_rating ?? null,
      categories: normalizeTaxonomy(rawProduct.categories),
      description: rawProduct.description ?? "",
      featuredImage: normalizeFeaturedImage(rawProduct.images),
      images: normalizeImages(rawProduct.images),
      inStock: rawProduct.stock_status === "instock",
      manageStock: rawProduct.manage_stock ?? false,
      price: parsePrice(rawProduct.price),
      regularPrice: parsePrice(rawProduct.regular_price),
      salePrice: parsePrice(rawProduct.sale_price),
      shortDescription: stripTags(rawProduct.short_description ?? ""),
      sku: rawProduct.sku ?? "",
      stockQuantity: rawProduct.stock_quantity ?? null,
      tags: normalizeTaxonomy(rawProduct.tags),
      variations: rawProduct.variations ?? []
    },
    seo: normalizeRankMathSeo(rawProduct)
  };
}

function normalizeFeaturedImage(images = []) {
  return normalizeImages(images)[0] ?? null;
}

function normalizeImages(images = []) {
  return images.map((image) => ({
    id: image.id,
    alt: image.alt ?? "",
    name: image.name ?? "",
    sourceUrl: image.src ?? null
  }));
}

function normalizeTaxonomy(items = []) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug
  }));
}

function parsePrice(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}
