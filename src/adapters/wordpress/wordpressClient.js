import { AdapterError } from "../../shared/errors.js";
import { resolveWordPressAuth } from "../../auth/sourceCredentials.js";

export default function createWordPressClient(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WordPress adapter option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const auth = resolveWordPressAuth(options, options.env ?? process.env);

  if (typeof fetchImpl !== "function") {
    throw new AdapterError("WordPress client requires a fetch implementation.");
  }

  return {
    async getJson(pathname) {
      const response = await fetchImpl(`${baseUrl}${pathname}`, createRequestInit(auth));

      if (!response.ok) {
        throw new AdapterError(`WordPress request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },

    async getCollection(pathname, query = {}) {
      const firstPage = await getCollectionPage(fetchImpl, baseUrl, pathname, query, auth, 1);
      const totalPages = Number.parseInt(firstPage.headers.get("x-wp-totalpages") ?? "1", 10);
      const items = [...assertCollection(firstPage.items, pathname)];

      for (let page = 2; page <= totalPages; page += 1) {
        const pageResult = await getCollectionPage(fetchImpl, baseUrl, pathname, query, auth, page);
        items.push(...assertCollection(pageResult.items, pathname));
      }

      return items;
    }
  };
}

function assertCollection(items, pathname) {
  if (!Array.isArray(items)) {
    throw new AdapterError(`WordPress collection "${pathname}" did not return an array.`);
  }

  return items;
}

async function getCollectionPage(fetchImpl, baseUrl, pathname, query, auth, page) {
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== false) {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(query.per_page ?? 100));

  const response = await fetchImpl(url, createRequestInit(auth));

  if (!response.ok) {
    throw new AdapterError(`WordPress request failed: ${response.status} ${response.statusText}`);
  }

  return {
    headers: response.headers,
    items: await response.json()
  };
}

function createRequestInit(auth) {
  if (!auth?.headers) {
    return undefined;
  }

  return {
    headers: auth.headers
  };
}
