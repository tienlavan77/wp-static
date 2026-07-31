import { JobTrigger } from "../scheduler/contracts/schedulerContracts.js";

export default function createSchedulerWebhookReceiver(options = {}) {
  const scheduler = options.scheduler;
  if (!scheduler || typeof scheduler.trigger !== "function") throw new TypeError("Scheduler webhook receiver requires a Scheduler.");
  return Object.freeze({
    async handle(request = {}) {
      if (request.method !== "POST") return { status: 405, body: { ok: false } };
      try {
        const payload = await request.json();
        const result = scheduler.trigger({ siteId: payload.siteId, triggerType: JobTrigger.WEBHOOK });
        return result.ok ? { status: 202, body: { jobId: result.job.id, ok: true } } : { status: 400, body: { diagnostics: result.diagnostics, ok: false } };
      } catch (error) {
        return { status: 400, body: { diagnostics: { errors: [{ code: "webhook.scheduler.payload.invalid", message: error.message, severity: "error" }], warnings: [] }, ok: false } };
      }
    }
  });
}
