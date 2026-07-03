import { AdapterError } from "../../shared/errors.js";

export default function createWooCommerceClient(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WooCommerce adapter option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new AdapterError("WooCommerce client requires a fetch implementation.");
  }

  return {
    async getCollection(pathname, query = {}) {
      const firstPage = await getCollectionPage(fetchImpl, baseUrl, pathname, options, query, 1);
      const totalPages = Number.parseInt(firstPage.headers.get("x-wp-totalpages") ?? "1", 10);
      const items = [...firstPage.items];

      for (let page = 2; page <= totalPages; page += 1) {
        const pageResult = await getCollectionPage(fetchImpl, baseUrl, pathname, options, query, page);
        items.push(...pageResult.items);
      }

      return items;
    }
  };
}

async function getCollectionPage(fetchImpl, baseUrl, pathname, options, query, page) {
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== false) {
      url.searchParams.set(key, String(value));
    }
  }

  if (options.consumerKey) {
    url.searchParams.set("consumer_key", options.consumerKey);
  }

  if (options.consumerSecret) {
    url.searchParams.set("consumer_secret", options.consumerSecret);
  }

  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(query.per_page ?? 100));

  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new AdapterError(`WooCommerce request failed: ${response.status} ${response.statusText}`);
  }

  return {
    headers: response.headers,
    items: await response.json()
  };
}
