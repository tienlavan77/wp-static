const SUPPORTED_SOURCES = new Set(["wordpress", "woocommerce"]);
const SUPPORTED_ACTIONS = new Set(["create", "update", "delete", "publish", "unpublish"]);
const TYPE_ALIASES = {
  attachment: "media",
  category: "term",
  nav_menu_item: "menu",
  page: "page",
  post: "post",
  post_tag: "term",
  product: "product",
  product_cat: "term",
  product_tag: "term",
  tag: "term",
  term: "term"
};

export default function normalizeWebhookPayload(payload = {}) {
  if (!isPlainObject(payload)) {
    throw new Error("Webhook payload must be a plain object.");
  }

  const source = normalizeSource(payload.source);
  const action = normalizeAction(payload.action ?? payload.event);
  const changed = normalizeChangedItems(payload);

  if (changed.length === 0) {
    throw new Error('Webhook payload field "changed" must contain at least one item.');
  }

  return {
    action,
    changed,
    eventId: normalizeOptionalString(payload.eventId ?? payload.id),
    receivedAt: normalizeOptionalString(payload.receivedAt) ?? new Date().toISOString(),
    source
  };
}

function normalizeSource(source) {
  if (typeof source !== "string" || !SUPPORTED_SOURCES.has(source.trim())) {
    throw new Error('Webhook payload field "source" must be "wordpress" or "woocommerce".');
  }

  return source.trim();
}

function normalizeAction(action) {
  if (typeof action !== "string" || !SUPPORTED_ACTIONS.has(action.trim())) {
    throw new Error(`Webhook payload field "action" must be one of: ${[...SUPPORTED_ACTIONS].join(", ")}.`);
  }

  return action.trim();
}

function normalizeChangedItems(payload) {
  const changed = Array.isArray(payload.changed)
    ? payload.changed
    : [payload.item ?? payload.object ?? payload];

  return changed
    .map(normalizeChangedItem)
    .filter(Boolean);
}

function normalizeChangedItem(item) {
  if (!isPlainObject(item)) {
    return null;
  }

  const rawType = item.type ?? item.objectType ?? item.postType ?? item.taxonomy;
  const type = normalizeType(rawType);
  const id = normalizeOptionalString(item.id ?? item.ID ?? item.termId);
  const slug = normalizeSlug(item.slug ?? item.post_name);
  const taxonomy = normalizeOptionalString(item.taxonomy);

  if (!type || (!id && !slug)) {
    return null;
  }

  return {
    id,
    slug,
    taxonomy,
    type
  };
}

function normalizeType(type) {
  if (typeof type !== "string" || type.trim() === "") {
    return null;
  }

  return TYPE_ALIASES[type.trim()] ?? type.trim();
}

function normalizeSlug(slug) {
  const value = normalizeOptionalString(slug);

  return value ? value.replace(/^\/+|\/+$/g, "") : null;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();

  return normalized === "" ? null : normalized;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
