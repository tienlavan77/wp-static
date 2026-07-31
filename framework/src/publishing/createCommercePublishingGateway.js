export const COMMERCE_PUBLISHING_GATEWAY_SCHEMA = "wpsc.commerce-publishing-gateway";
export const COMMERCE_PUBLISHING_GATEWAY_VERSION = 1;

// The gateway translates WooCommerce events; Publishing Coordinator remains the policy owner.
export default function createCommercePublishingGateway(options = {}) {
  const publishing = options.publishing;
  if (!publishing || typeof publishing.publish !== "function") throw new TypeError("Commerce Publishing Gateway requires a Publishing Coordinator.");

  function publish(input = {}) {
    const siteId = String(input.siteId ?? "").trim();
    if (!siteId) throw new TypeError("Commerce publishing requires a Site id.");
    const event = input.event ?? input.payload ?? {};
    const entityType = normalizeCommerceType(event.type ?? event.resource ?? event.topic ?? event.action ?? event.event);
    return publishing.publish({
      payload: {
        action: normalizeAction(event.action ?? event.event ?? event.topic),
        changed: [{
          id: event.id ?? event.resourceId,
          productId: event.productId ?? event.product_id ?? event.parentId,
          productSlug: event.productSlug ?? event.product_slug ?? event.parentSlug,
          slug: event.slug,
          taxonomy: entityType === "term" ? event.taxonomy ?? "product_cat" : null,
          type: entityType
        }],
        eventId: event.eventId ?? event.webhookId ?? event.deliveryId,
        receivedAt: event.receivedAt,
        source: "woocommerce"
      },
      siteId
    });
  }

  return Object.freeze({ publish, schema: COMMERCE_PUBLISHING_GATEWAY_SCHEMA, schemaVersion: COMMERCE_PUBLISHING_GATEWAY_VERSION });
}

function normalizeCommerceType(value) {
  const type = String(value ?? "product").toLowerCase();
  if (type.includes("variation")) return "variation";
  if (type.includes("inventory") || type.includes("stock")) return "inventory";
  if (type.includes("price")) return "price";
  if (type.includes("category") || type.includes("product_cat")) return "term";
  return "product";
}

function normalizeAction(value) {
  const action = String(value ?? "update").toLowerCase();
  if (action.includes("delete")) return "delete";
  if (action.includes("create")) return "create";
  if (action.includes("publish")) return "publish";
  return "update";
}
