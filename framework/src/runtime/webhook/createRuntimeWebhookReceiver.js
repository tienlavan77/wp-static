import { readFile } from "node:fs/promises";
import path from "node:path";
import createPublishEventCoordinator from "../../publishing/createPublishEventCoordinator.js";
import createSiteContext from "../../site/createSiteContext.js";

export const RUNTIME_WEBHOOK_RECEIVER_VERSION = "1.0";

function failure(code, message, status) { return { body: { diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }, status }; }

export default function createRuntimeWebhookReceiver(options = {}) {
  const repository = options.repository;
  const scheduler = options.scheduler;
  if (!repository || typeof repository.resolveSiteRoot !== "function" || !scheduler || typeof scheduler.trigger !== "function") throw new TypeError("Runtime Webhook Receiver requires Repository and Scheduler.");
  const publishing = options.publishing ?? createPublishEventCoordinator({
    idempotencyTtlMs: options.idempotencyTtlMs,
    now: options.now,
    nowMs: options.nowMs,
    scheduler
  });
  return Object.freeze({
    async handle(siteId, uuid, request = {}) {
      const siteContext = createSiteContext({ siteId });
      siteId = siteContext.siteId;
      if (String(request.method || "POST").toUpperCase() !== "POST") return failure("runtime.webhook.method.invalid", "Webhook endpoint accepts POST only.", 405);
      let config;
      try {
        config = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(siteId), "config", "webhook.json"), "utf8"));
      } catch (error) {
        return failure("runtime.webhook.configuration.unavailable", error.message, 500);
      }
      const secret = request.headers?.["x-wpsc-webhook-secret"];
      if (config.uuid !== uuid) return failure("runtime.webhook.uuid.invalid", "Webhook Site UUID is invalid.", 404);
      if (!secret || secret !== config.secret) return failure("runtime.webhook.secret.invalid", "Webhook secret is invalid.", 401);
      try {
        const published = publishing.publish({ payload: request.body || {}, siteId });
        const queued = published.queued;
        return queued.ok ? { body: { changed: published.changed, jobId: queued.job.id, ok: true }, status: 202 } : { body: { diagnostics: queued.diagnostics, ok: false }, status: 409 };
      } catch (error) {
        return failure("runtime.webhook.payload.invalid", error.message, 400);
      }
    },
    version: RUNTIME_WEBHOOK_RECEIVER_VERSION
  });
}
