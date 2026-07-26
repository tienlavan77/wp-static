import createWordPressAdapter from "../wordpress/wordpressAdapter.js";
import createWooCommerceAdapter from "../woocommerce/woocommerceAdapter.js";

export default function createWordPressWooCommerceAdapter(options = {}) {
  const wordpress = createWordPressAdapter({
    ...options.shared,
    ...options.wordpress
  });
  const woocommerce = createWooCommerceAdapter({
    ...options.shared,
    ...options.woocommerce
  });

  return {
    async getContents() {
      const [wordpressContents, woocommerceContents] = await Promise.all([
        wordpress.getContents(),
        woocommerce.getContents()
      ]);

      return [
        ...wordpressContents,
        ...woocommerceContents
      ];
    },

    async getCollections() {
      const [wordpressCollections, woocommerceCollections] = await Promise.all([
        readCollections(wordpress),
        readCollections(woocommerce)
      ]);

      return mergeCollections(wordpressCollections, woocommerceCollections);
    }
  };
}

async function readCollections(adapter) {
  if (typeof adapter.getCollections !== "function") {
    return {};
  }

  return adapter.getCollections();
}

function mergeCollections(wordpressCollections = {}, woocommerceCollections = {}) {
  return {
    ...wordpressCollections,
    ...woocommerceCollections,
    categories: woocommerceCollections.categories ?? [],
    media: wordpressCollections.media ?? [],
    menus: wordpressCollections.menus ?? [],
    productCategories: woocommerceCollections.categories ?? [],
    productTags: woocommerceCollections.tags ?? [],
    tags: woocommerceCollections.tags ?? [],
    terms: [
      ...(wordpressCollections.terms ?? []),
      ...normalizeProductTerms(woocommerceCollections.categories ?? [], "product_cat"),
      ...normalizeProductTerms(woocommerceCollections.tags ?? [], "product_tag")
    ]
  };
}

function normalizeProductTerms(items, taxonomy) {
  return items.map((item) => ({
    count: item.count ?? 0,
    description: item.description ?? "",
    id: item.id,
    image: normalizeTermImage(item.image),
    menuOrder: item.menu_order ?? 0,
    name: item.name,
    parentId: item.parent ?? null,
    slug: item.slug,
    taxonomy,
    data: {
      count: item.count ?? 0,
      description: item.description ?? "",
      image: normalizeTermImage(item.image),
      menuOrder: item.menu_order ?? 0
    }
  }));
}

function normalizeTermImage(image) {
  if (!image) {
    return null;
  }

  return {
    alt: image.alt ?? "",
    id: image.id ?? null,
    name: image.name ?? "",
    sourceUrl: image.src ?? image.sourceUrl ?? image.url ?? null
  };
}
