export default function createCommerceCollections(products = []) {
  const onSale = products.filter(isOnSaleProduct);
  const inStock = products.filter((product) => product.data?.inStock === true);
  const outOfStock = products.filter((product) => product.data?.inStock === false);

  return {
    products: {
      inStock: inStock.map(toProductSummary),
      onSale: onSale.map(toProductSummary),
      outOfStock: outOfStock.map(toProductSummary)
    }
  };
}

function isOnSaleProduct(product) {
  const salePrice = product.data?.salePrice;
  const regularPrice = product.data?.regularPrice ?? product.data?.price;

  return typeof salePrice === "number" && typeof regularPrice === "number" && salePrice < regularPrice;
}

function toProductSummary(product) {
  return {
    id: product.id,
    inStock: product.data?.inStock ?? null,
    price: product.data?.price ?? null,
    salePrice: product.data?.salePrice ?? null,
    slug: product.slug,
    title: product.title
  };
}
