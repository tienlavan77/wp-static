export default function createProductVariantContents(products = []) {
  return products.flatMap((product) => {
    const variants = Array.isArray(product.data?.variants) ? product.data.variants : [];

    return variants.map((variant) => createVariantContent(product, variant));
  });
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
  const value = variant.slug ?? variant.sku ?? variant.name;

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Product variant requires slug, sku, or name.");
  }

  return value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
