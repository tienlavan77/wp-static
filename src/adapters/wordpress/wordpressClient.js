import { AdapterError } from "../../shared/errors.js";

export default function createWordPressClient(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WordPress adapter option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new AdapterError("WordPress client requires a fetch implementation.");
  }

  return {
    async getJson(pathname) {
      const response = await fetchImpl(`${baseUrl}${pathname}`);

      if (!response.ok) {
        throw new AdapterError(`WordPress request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    async getCollection(pathname, query = {}) {
      const firstPage = await getCollectionPage(fetchImpl, baseUrl, pathname, query, 1);
      const totalPages = Number.parseInt(firstPage.headers.get("x-wp-totalpages") ?? "1", 10);
      const items = [...firstPage.items];

      for (let page = 2; page <= totalPages; page += 1) {
        const pageResult = await getCollectionPage(fetchImpl, baseUrl, pathname, query, page);
        items.push(...pageResult.items);
      }

      return items;
    }
  };
}

async function getCollectionPage(fetchImpl, baseUrl, pathname, query, page) {
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== false) {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(query.per_page ?? 100));

  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new AdapterError(`WordPress request failed: ${response.status} ${response.statusText}`);
  }

  return {
    headers: response.headers,
    items: await response.json()
  };
}
