export default function createProductVariantContents(products = []) {
  return products.flatMap((product) => {
    const variants = Array.isArray(product.data?.variants)
      ? product.data.variants
      : product.data?.variations ?? [];

    return dedupeVariants(variants)
      .filter((variant) => variant !== null && typeof variant === "object")
      .map((variant) => createVariantContent(product, variant));
  });
}

function dedupeVariants(variants) {
  const seen = new Set();
  const unique = [];

  for (const variant of variants) {
    const key = getVariantKey(variant);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(variant);
  }

  return unique;
}

function getVariantKey(variant) {
  if (variant !== null && typeof variant === "object") {
    return normalizeVariantSlug(variant);
  }

  return variant;
}

function createVariantContent(product, variant) {
  const variantSlug = normalizeVariantSlug(variant);

  return {
    domain: product.domain,
    id: `${product.id}:variant:${variantSlug}`,
    slug: `${product.slug}-${variantSlug}`,
    status: product.status,
    title: `${product.title} - ${variant.name ?? variantSlug}`,
    type: "product_variant",
    data: {
      ...product.data,
      parentProductId: product.id,
      parentProductSlug: product.slug,
      price: variant.price ?? product.data?.price,
      sku: variant.sku ?? product.data?.sku,
      variant
    },
    seo: product.seo
  };
}

function normalizeVariantSlug(variant) {
  const value = variant.slug ?? variant.sku ?? variant.name ?? variant.id;

  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") {
    throw new Error("Product variant requires slug, sku, or name.");
  }

  return String(value).trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
