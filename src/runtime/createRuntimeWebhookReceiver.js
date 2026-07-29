import { readFile } from "node:fs/promises";
import path from "node:path";
import { JobTrigger } from "../scheduler/schedulerContracts.js";
import normalizeWebhookPayload from "../webhook/normalizeWebhookPayload.js";

export const RUNTIME_WEBHOOK_RECEIVER_VERSION = "1.0";

function failure(code, message, status) { return { body: { diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }, status }; }

function toChangedHints(payload) {
  return payload.changed.map((item) => {
    const identifier = item.slug || item.id;
    return item.type === "term"
      ? `term:${item.taxonomy}:${identifier}`
      : `${item.type}:${identifier}`;
  }).filter(Boolean);
}

export default function createRuntimeWebhookReceiver(options = {}) {
  const repository = options.repository;
  const scheduler = options.scheduler;
  if (!repository || typeof repository.resolveSiteRoot !== "function" || !scheduler || typeof scheduler.trigger !== "function") throw new TypeError("Runtime Webhook Receiver requires Repository and Scheduler.");
  return Object.freeze({
    async handle(siteId, uuid, request = {}) {
      if (String(request.method || "POST").toUpperCase() !== "POST") return failure("runtime.webhook.method.invalid", "Webhook endpoint accepts POST only.", 405);
      try {
        const config = JSON.parse(await readFile(path.join(repository.resolveSiteRoot(siteId), "config", "webhook.json"), "utf8"));
        const secret = request.headers?.["x-wpsc-webhook-secret"];
        if (config.uuid !== uuid) return failure("runtime.webhook.uuid.invalid", "Webhook Site UUID is invalid.", 404);
        if (!secret || secret !== config.secret) return failure("runtime.webhook.secret.invalid", "Webhook secret is invalid.", 401);
        const payload = normalizeWebhookPayload(request.body || {});
        const changed = toChangedHints(payload);
        const queued = scheduler.trigger({ changed, siteId, triggerType: JobTrigger.WEBHOOK });
        return queued.ok ? { body: { changed, jobId: queued.job.id, ok: true }, status: 202 } : { body: { diagnostics: queued.diagnostics, ok: false }, status: 409 };
      } catch (error) { return failure("runtime.webhook.configuration.unavailable", error.message, 500); }
    },
    version: RUNTIME_WEBHOOK_RECEIVER_VERSION
  });
}
