import { createHash } from "node:crypto";
import deepFreeze from "../shared/deepFreeze.js";
import { JobTrigger } from "../scheduler/contracts/schedulerContracts.js";
import normalizeWebhookPayload from "../webhook/normalizeWebhookPayload.js";

export const PUBLISH_EVENT_SCHEMA = "wpsc.publish-event";
export const PUBLISH_EVENT_VERSION = 1;

export default function createPublishEventCoordinator(options = {}) {
  const scheduler = options.scheduler;
  if (!scheduler || typeof scheduler.trigger !== "function") {
    throw new TypeError("Publish Event Coordinator requires a Scheduler.");
  }
  const now = options.now ?? (() => new Date().toISOString());
  const nowMs = options.nowMs ?? (() => Date.now());
  const idempotencyTtlMs = options.idempotencyTtlMs ?? 300_000;
  const processed = new Map();
  const cache = options.cache;

  function publish(input = {}) {
    const siteId = String(input.siteId ?? "").trim();
    if (!siteId) throw new TypeError("Publish event requires a Site id.");
    const payload = normalizeWebhookPayload(input.payload ?? {});
    const eventId = payload.eventId ?? createFallbackEventId(siteId, payload);
    const processedKey = `${siteId}:${eventId}`;
    pruneProcessed(processed, nowMs(), idempotencyTtlMs);
    const previous = processed.get(processedKey);
    if (previous) {
      return { ...previous.result, duplicate: true };
    }

    const timestamp = payload.receivedAt ?? now();
    const events = deepFreeze(payload.changed.map((change, index) => createPublishEvent({
      change,
      changeType: payload.action,
      eventId: payload.changed.length === 1 ? eventId : `${eventId}:${index + 1}`,
      siteId,
      source: payload.source,
      timestamp
    })));
    const changed = events.map(toChangedHint).filter(Boolean);
    const queued = scheduler.trigger({ changed, changes: events, siteId, triggerType: JobTrigger.WEBHOOK });
    const result = { changed, duplicate: false, eventId, events, queued };
    if (queued.ok) {
      for (const event of events) cache?.invalidateEvent?.(event);
      processed.set(processedKey, { processedAt: nowMs(), result, siteId });
    }
    return result;
  }

  return Object.freeze({ publish, schema: PUBLISH_EVENT_SCHEMA, schemaVersion: PUBLISH_EVENT_VERSION });
}

function createPublishEvent(input) {
  return deepFreeze({
    changeType: input.changeType,
    entityId: input.change.id ?? input.change.slug,
    entityType: input.change.type,
    eventId: input.eventId,
    schema: PUBLISH_EVENT_SCHEMA,
    schemaVersion: PUBLISH_EVENT_VERSION,
    siteId: input.siteId,
    productId: input.change.productId,
    productSlug: input.change.productSlug,
    previousSlug: input.change.previousSlug,
    previousUrl: input.change.previousUrl,
    slug: input.change.slug,
    source: input.source,
    taxonomy: input.change.taxonomy,
    timestamp: input.timestamp,
    url: input.change.url
  });
}

function toChangedHint(event) {
  const commerceChild = ["inventory", "price", "variation"].includes(event.entityType);
  const identifier = commerceChild
    ? event.productSlug || event.productId || event.slug || event.entityId
    : event.slug || event.entityId;
  if (!identifier) return null;
  if (commerceChild) return `product:${identifier}`;
  return event.entityType === "term"
    ? `term:${event.taxonomy}:${identifier}`
    : `${event.entityType}:${identifier}`;
}

function createFallbackEventId(siteId, payload) {
  const canonical = JSON.stringify({
    action: payload.action,
    changed: payload.changed,
    siteId,
    source: payload.source
  });
  return `generated:${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
}

function pruneProcessed(processed, currentTime, ttlMs) {
  for (const [eventId, entry] of processed) {
    if (currentTime - entry.processedAt >= ttlMs) processed.delete(eventId);
  }
}
