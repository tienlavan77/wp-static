import normalizeRankMathSeo from "../wordpress/normalizeRankMathSeo.js";
import toJsonData from "../../shared/toJsonData.js";

export default function normalizeWooCommerceProduct(rawProduct = {}) {
  const slug = rawProduct.slug ?? String(rawProduct.id);

  return {
    id: `product-${rawProduct.id}`,
    type: "product",
    title: stripTags(rawProduct.name ?? slug),
    slug,
    status: rawProduct.status ?? null,
    domain: "woocommerce",
    data: toJsonData({
      acf: rawProduct.acf ?? {},
      averageRating: rawProduct.average_rating ?? null,
      categories: normalizeTaxonomy(rawProduct.categories),
      // Keep the provider identifier separate from the framework Content ID.
      // Commerce requests must use this numeric WooCommerce product ID.
      woocommerceProductId: String(rawProduct.id),
      description: rawProduct.description ?? "",
      featuredImage: normalizeFeaturedImage(rawProduct.images),
      images: normalizeImages(rawProduct.images),
      inStock: rawProduct.stock_status === "instock",
      manageStock: rawProduct.manage_stock ?? false,
      price: parsePrice(rawProduct.price),
      regularPrice: parsePrice(rawProduct.regular_price),
      salePrice: parsePrice(rawProduct.sale_price),
      shortDescription: stripTags(rawProduct.short_description ?? ""),
      shortDescriptionHtml: rawProduct.short_description ?? "",
      sku: rawProduct.sku ?? "",
      stockQuantity: rawProduct.stock_quantity ?? null,
      tags: normalizeTaxonomy(rawProduct.tags),
      terms: [
        ...normalizeTaxonomy(rawProduct.categories, "product_cat"),
        ...normalizeTaxonomy(rawProduct.tags, "product_tag")
      ],
      variants: normalizeVariations(rawProduct.variations, slug),
      variations: rawProduct.variations ?? []
    }),
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

function normalizeTaxonomy(items = [], taxonomy = null) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    ...(taxonomy ? { taxonomy } : {})
  }));
}

function normalizeVariations(variations = [], productSlug) {
  return variations.map((variation) => {
    const name = normalizeVariationName(variation);
    const slug = normalizeVariationSlug(variation, name, productSlug);

    return {
      id: variation.id,
      attributes: normalizeVariationAttributes(variation.attributes),
      featuredImage: normalizeVariationImage(variation.image),
      inStock: variation.stock_status === "instock",
      manageStock: variation.manage_stock ?? false,
      name,
      price: parsePrice(variation.price),
      regularPrice: parsePrice(variation.regular_price),
      salePrice: parsePrice(variation.sale_price),
      sku: variation.sku ?? "",
      slug,
      stockQuantity: variation.stock_quantity ?? null
    };
  });
}

function normalizeVariationAttributes(attributes = []) {
  return attributes.map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    option: attribute.option,
    slug: attribute.slug
  }));
}

function normalizeVariationImage(image) {
  if (!image) {
    return null;
  }

  return {
    id: image.id,
    alt: image.alt ?? "",
    name: image.name ?? "",
    sourceUrl: image.src ?? null
  };
}

function normalizeVariationName(variation) {
  const options = normalizeVariationAttributes(variation.attributes)
    .map((attribute) => attribute.option)
    .filter(Boolean);

  if (options.length > 0) {
    return options.join(" / ");
  }

  return stripTags(variation.name ?? `Variation ${variation.id}`);
}

function normalizeVariationSlug(variation, name, productSlug) {
  const value = variation.slug ?? variation.sku ?? name ?? variation.id;
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || `${productSlug}-variation-${variation.id}`;
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
