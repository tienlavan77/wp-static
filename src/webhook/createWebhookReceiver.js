import buildProjectOnce from "../dev-server/buildProjectOnce.js";
import createFreshBuildOptions from "../invalidate/createFreshBuildOptions.js";
import createRebuildQueue from "../queue/createRebuildQueue.js";
import mapWebhookChanges from "./mapWebhookChanges.js";
import normalizeWebhookPayload from "./normalizeWebhookPayload.js";

export default function createWebhookReceiver(options = {}) {
  const secret = options.secret ?? process.env.WPSC_WEBHOOK_SECRET ?? null;
  const queue = options.queue ?? createRebuildQueue({
    logger: options.logger,
    rebuild: options.rebuild ?? createProjectRebuild(options)
  });
  const waitUntilBuilt = options.waitUntilBuilt !== false;

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
      logReceivedWebhook(options.logger, payload, changes);
      const rebuildRequest = {
        changes,
        payload,
        reason: changes.map((change) => change.reason).join(", ")
      };

      if (!waitUntilBuilt) {
        void queue.enqueue(rebuildRequest);

        return json({
          changes,
          eventId: payload.eventId,
          rebuild: "queued"
        }, {
          status: 202
        });
      }

      const rebuildResult = await queue.enqueue(rebuildRequest);

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

function logReceivedWebhook(logger, payload, changes) {
  const summary = changes.map((change) => {
    const label = change.taxonomy ?? change.type;
    const slugOrId = change.routeSlug || change.id || "unknown";

    return `${payload.action} ${label} ${slugOrId}`;
  }).join(", ");

  logger?.info?.(`Webhook received: ${summary || payload.eventId}`);
}

function createProjectRebuild(options) {
  return async (request = {}) => buildProjectOnce(options.projectDir ?? process.cwd(), createFreshBuildOptions({
    cacheBust: Date.now(),
    changed: createChangedArgs(request.changes),
    onProgress(event) {
      options.logger?.info?.(`Build progress: ${event.message}`);
    },
    preview: options.preview,
    previewToken: options.previewToken
  }));
}

function createChangedArgs(changes = []) {
  return changes
    .map((change) => {
      if (!change?.routeSlug) {
        return null;
      }

      if (change.type === "term") {
        return change.taxonomy ? `term:${change.taxonomy}:${change.routeSlug}` : null;
      }

      return `${change.type}:${change.routeSlug}`;
    })
    .filter(Boolean);
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
