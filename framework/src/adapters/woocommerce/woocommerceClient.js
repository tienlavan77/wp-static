import { AdapterError } from "../../shared/errors.js";
import { resolveWooCommerceCredentials } from "../../auth/sourceCredentials.js";

export default function createWooCommerceClient(options = {}) {
  if (typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new AdapterError('WooCommerce adapter option "baseUrl" is required.');
  }

  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const credentials = resolveWooCommerceCredentials(options, options.env ?? process.env);

  if (typeof fetchImpl !== "function") {
    throw new AdapterError("WooCommerce client requires a fetch implementation.");
  }

  return {
    async getCollection(pathname, query = {}) {
      const firstPage = await getCollectionPage(fetchImpl, baseUrl, pathname, credentials, query, 1);
      const totalPages = Number.parseInt(firstPage.headers.get("x-wp-totalpages") ?? "1", 10);
      const items = [...assertCollection(firstPage.items, pathname)];

      for (let page = 2; page <= totalPages; page += 1) {
        const pageResult = await getCollectionPage(fetchImpl, baseUrl, pathname, credentials, query, page);
        items.push(...assertCollection(pageResult.items, pathname));
      }

      return items;
    },

    async getResource(pathname, query = {}) {
      const response = await getWooCommerceResponse(fetchImpl, baseUrl, pathname, credentials, query);
      return parseJsonResponse(response, pathname);
    },

    async createResource(pathname, payload = {}, query = {}) {
      const response = await getWooCommerceResponse(fetchImpl, baseUrl, pathname, credentials, query, {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
      return parseJsonResponse(response, pathname);
    },

    async updateResource(pathname, payload = {}, query = {}) {
      const response = await getWooCommerceResponse(fetchImpl, baseUrl, pathname, credentials, query, {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json"
        },
        method: "PUT"
      });
      return parseJsonResponse(response, pathname);
    }
  };
}

function assertCollection(items, pathname) {
  if (!Array.isArray(items)) {
    throw new AdapterError(`WooCommerce collection "${pathname}" did not return an array.`);
  }

  return items;
}

async function getCollectionPage(fetchImpl, baseUrl, pathname, credentials, query, page) {
  const response = await getWooCommerceResponse(fetchImpl, baseUrl, pathname, credentials, {
    ...query,
    page,
    per_page: query.per_page ?? 100
  });

  return {
    headers: response.headers,
    items: await parseJsonResponse(response, pathname)
  };
}

async function getWooCommerceResponse(fetchImpl, baseUrl, pathname, credentials, query = {}, init = {}) {
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== false) {
      url.searchParams.set(key, String(value));
    }
  }

  if (credentials.consumerKey) {
    url.searchParams.set("consumer_key", credentials.consumerKey);
  }

  if (credentials.consumerSecret) {
    url.searchParams.set("consumer_secret", credentials.consumerSecret);
  }

  const response = await fetchImpl(url, init);

  if (!response.ok) {
    const detail = await readWooError(response);
    const error = new AdapterError(`WooCommerce request failed: ${response.status} ${detail.message || response.statusText || ""}`.trim());
    error.status = response.status;
    error.providerCode = detail.code;
    throw error;
  }

  return response;
}

async function readWooError(response) {
  if (typeof response.text !== "function") return { code: "", message: "" };

  const body = await response.text().catch(() => "");
  if (!body) return { code: "", message: "" };

  try {
    const payload = JSON.parse(body);
    const message = payload?.message || payload?.error || "";
    const code = payload?.code || "";
    return {
      code,
      message: message ? `${message}${code ? ` (${code})` : ""}` : code
    };
  } catch {
    return { code: "", message: body.slice(0, 500) };
  }
}

async function parseJsonResponse(response, pathname) {
  const body = typeof response.text === "function"
    ? await response.text()
    : JSON.stringify(await response.json());

  try {
    return JSON.parse(body);
  } catch {
    const jsonStart = findJsonStart(body);

    if (jsonStart > 0) {
      try {
        return JSON.parse(body.slice(jsonStart));
      } catch {
        // Fall through to the clearer adapter error below.
      }
    }

    throw new AdapterError(`WooCommerce collection "${pathname}" did not return valid JSON.`);
  }
}

function findJsonStart(body) {
  const objectStart = body.indexOf("{");
  const arrayStart = body.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);

  return starts.length > 0 ? Math.min(...starts) : -1;
}
