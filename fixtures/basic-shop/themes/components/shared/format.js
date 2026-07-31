export function formatPrice(value, currency = "VND") {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return new Intl.NumberFormat("vi-VN", {
    currency,
    style: "currency"
  }).format(Number(value));
}

export function formatProductPrice(product) {
  const data = product.data ?? {};
  const currency = data.currency ?? product.currency ?? "VND";
  const variantPrices = collectVariantPrices(product);

  if (variantPrices.length > 0) {
    return `Từ ${formatPrice(Math.min(...variantPrices), currency)}`;
  }

  return formatPrice(data.price ?? product.price, currency);
}

export function getProductSortPrice(product) {
  const data = product.data ?? {};
  const variantPrices = collectVariantPrices(product);

  if (variantPrices.length > 0) {
    return String(Math.min(...variantPrices));
  }

  const price = Number(data.price ?? product.price);
  return Number.isFinite(price) ? String(price) : "";
}

function collectVariantPrices(product) {
  const data = product.data ?? {};

  return [
    ...(Array.isArray(data.variants) ? data.variants : []),
    ...(Array.isArray(data.variations) ? data.variations : []),
    ...(Array.isArray(product.variants) ? product.variants : [])
  ]
    .map((variant) => variant?.price ?? variant?.salePrice ?? variant?.regularPrice)
    .map((price) => Number(price))
    .filter((price) => Number.isFinite(price) && price > 0);
}
