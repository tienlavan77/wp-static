import deepFreeze from "../shared/deepFreeze.js";

export const SEARCH_CONTRACT_SCHEMA = "wpsc.search-index";
export const SEARCH_CONTRACT_VERSION = 1;

export default function createSearchService(options = {}) {
  const defaultSiteId = options.siteId ?? null;

  function createIndex(input = {}) {
    return freezeIndex(input.siteId ?? defaultSiteId, input.items ?? []);
  }

  function replace(index, items = []) {
    assertIndex(index);
    return freezeIndex(index.siteId, items);
  }

  function update(index, items = []) {
    assertIndex(index);
    const byId = new Map((index.items ?? []).map((item) => [String(item.id), item]));
    for (const item of items) byId.set(String(item.id), item);
    return freezeIndex(index.siteId, [...byId.values()]);
  }

  function invalidate(index) {
    assertIndex(index);
    return deepFreeze({ ...freezeIndex(index.siteId, []), invalidated: true });
  }

  function query(index, input = {}) {
    assertIndex(index);
    const queryText = normalizeText(input.query ?? input.q ?? "");
    const requestedSiteId = input.siteId ?? defaultSiteId;
    if (requestedSiteId !== null && index.siteId !== null && requestedSiteId !== index.siteId) {
      return freezeResults(index.siteId, queryText, []);
    }

    if (!queryText) return freezeResults(index.siteId, queryText, []);
    const tokens = queryText.split(/\s+/).filter(Boolean);
    const results = (index.items ?? [])
      .map((item) => ({ item, score: scoreItem(item, queryText, tokens) }))
      .filter((result) => result.score > 0)
      .sort((first, second) => second.score - first.score || String(first.item.title ?? first.item.id).localeCompare(String(second.item.title ?? second.item.id)))
      .map((result) => ({ ...result.item, ranking: { score: result.score } }));

    return freezeResults(index.siteId, queryText, results);
  }

  return Object.freeze({ create: createIndex, invalidate, query, rebuild: createIndex, replace, update, schema: SEARCH_CONTRACT_SCHEMA, schemaVersion: SEARCH_CONTRACT_VERSION });
}

function freezeIndex(siteId, items) {
  return deepFreeze({
    invalidated: false,
    itemCount: Array.isArray(items) ? items.length : 0,
    items: Array.isArray(items) ? items : [],
    kind: "searchIndex",
    schema: SEARCH_CONTRACT_SCHEMA,
    schemaVersion: SEARCH_CONTRACT_VERSION,
    siteId
  });
}

function freezeResults(siteId, query, results) {
  return deepFreeze({
    query,
    results,
    schema: "wpsc.search-results",
    schemaVersion: SEARCH_CONTRACT_VERSION,
    siteId,
    total: results.length
  });
}

function scoreItem(item, query, tokens) {
  const title = normalizeText(item.title ?? "");
  const haystack = normalizeText(item.keywords ?? [item.title, item.slug, item.category, ...(item.categories ?? [])].join(" "));
  if (!tokens.every((token) => haystack.includes(token))) return 0;
  return (title === query ? 100 : title.startsWith(query) ? 50 : 0) + tokens.reduce((score, token) => score + (title.includes(token) ? 10 : 1), 0);
}

function assertIndex(index) {
  if (!index || index.schema !== SEARCH_CONTRACT_SCHEMA || index.schemaVersion !== SEARCH_CONTRACT_VERSION) {
    throw new TypeError("Search Service requires a compatible Search Index contract.");
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}
