export function normalizeCartItem(item) {
  const productId = item.productId ?? item.id;
  const variationId = item.variationId ?? item.variant?.id ?? null;
  const quantity = Number(item.quantity ?? 1);

  if (!productId) {
    throw new Error('Cart item field "productId" is required.');
  }

  return {
    key: `${productId}:${variationId ?? 0}`,
    productId,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    variationId
  };
}
