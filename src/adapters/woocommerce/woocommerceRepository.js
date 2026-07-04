import normalizeWooCommerceProduct from "./normalizeWooCommerceProduct.js";

export default function createWooCommerceRepository(client, options = {}) {
  return {
    async getContents() {
      const products = await client.getCollection("/wp-json/wc/v3/products", {
        status: "publish"
      });
      const variationsByProduct = options.includeVariations === true
        ? await fetchVariationsByProduct(client, products)
        : new Map();

      return products.map((product) => normalizeWooCommerceProduct({
        ...product,
        variations: variationsByProduct.get(product.id) ?? product.variations ?? []
      }));
    },

    async getCategories() {
      if (options.includeCategories === false) {
        return [];
      }

      return client.getCollection("/wp-json/wc/v3/products/categories");
    },

    async getTags() {
      if (options.includeTags === false) {
        return [];
      }

      return client.getCollection("/wp-json/wc/v3/products/tags");
    }
  };
}

async function fetchVariationsByProduct(client, products) {
  const entries = await Promise.all(products.map(async (product) => {
    const variations = await client.getCollection(`/wp-json/wc/v3/products/${product.id}/variations`);

    return [product.id, variations];
  }));

  return new Map(entries);
}
