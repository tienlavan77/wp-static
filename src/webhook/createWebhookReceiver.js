import buildProjectOnce from "../dev-server/buildProjectOnce.js";
import createRebuildQueue from "./createRebuildQueue.js";
import mapWebhookChanges from "./mapWebhookChanges.js";
import normalizeWebhookPayload from "./normalizeWebhookPayload.js";

export default function createWebhookReceiver(options = {}) {
  const secret = options.secret ?? process.env.WPSC_WEBHOOK_SECRET ?? null;
  const queue = options.queue ?? createRebuildQueue({
    logger: options.logger,
    rebuild: options.rebuild ?? createProjectRebuild(options)
  });

  return {
    async handle(request) {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed" }, { status: 405 });
      }

      if (!isAuthorized(request, secret)) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }

      let payload;

      try {
        payload = normalizeWebhookPayload(await request.json());
      } catch (error) {
        return json({ error: error.message }, { status: 400 });
      }

      const changes = mapWebhookChanges(payload);
      const rebuildResult = await queue.enqueue({
        changes,
        payload,
        reason: changes.map((change) => change.reason).join(", ")
      });

      return json({
        changes,
        eventId: payload.eventId,
        rebuild: rebuildResult.status
      }, {
        status: rebuildResult.queued ? 202 : 200
      });
    },
    queue
  };
}

function createProjectRebuild(options) {
  return async () => buildProjectOnce(options.projectDir ?? process.cwd(), {
    cacheBust: Date.now(),
    preview: options.preview,
    previewToken: options.previewToken
  });
}

function isAuthorized(request, secret) {
  if (!secret) {
    return true;
  }

  return request.headers.get("x-wpsc-webhook-secret") === secret;
}

function json(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    status: options.status ?? 200
  });
}
