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

    async getContentsByChanges(changes = []) {
      const records = await Promise.all(changes.map(async (change) => {
        if (change.type !== "product") return null;
        const products = await client.getCollection("/wp-json/wc/v3/products", { slug: change.routeSlug, status: "publish" });
        const product = products.find((item) => String(item.id) === String(change.id) || item.slug === change.routeSlug);
        if (!product) return null;
        const variations = options.includeVariations === true
          ? await client.getCollection(`/wp-json/wc/v3/products/${product.id}/variations`)
          : product.variations ?? [];
        return normalizeWooCommerceProduct({ ...product, variations });
      }));
      return records.some((record) => !record) ? null : records;
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
    },

    async getAttributes() {
      if (options.includeAttributes === false) return [];
      return client.getCollection("/wp-json/wc/v3/products/attributes");
    },

    async getStoreConfiguration() {
      if (options.includeStoreConfiguration === false) return [];
      return client.getCollection("/wp-json/wc/v3/settings/general");
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
