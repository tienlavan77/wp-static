export function normalizeCartItem(item) {
  const productId = item.productId ?? item.id;
  const quantity = Number(item.quantity ?? 1);

  if (!productId) {
    throw new Error('Cart item field "productId" is required.');
  }

  return {
    productId,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  };
}
