export default function mapWebhookChanges(payload) {
  return payload.changed.map((item) => ({
    ...(item.productId ? { productId: item.productId } : {}),
    ...(item.productSlug ? { productSlug: item.productSlug } : {}),
    id: item.id,
    reason: createReason(payload, item),
    routeSlug: item.slug,
    source: payload.source,
    taxonomy: item.taxonomy,
    type: item.type
  }));
}

function createReason(payload, item) {
  const parts = [payload.source, payload.action, item.type];

  if (item.taxonomy) {
    parts.push(item.taxonomy);
  }

  if (item.slug) {
    parts.push(item.slug);
  } else if (item.id) {
    parts.push(item.id);
  }

  return parts.join(":");
}
