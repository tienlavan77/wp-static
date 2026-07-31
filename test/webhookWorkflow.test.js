import assert from "node:assert/strict";
import test from "node:test";
import createRebuildQueue from "../framework/src/scheduler/queue/createRebuildQueue.js";
import createWebhookReceiver from "../framework/src/webhook/createWebhookReceiver.js";
import mapWebhookChanges from "../framework/src/webhook/mapWebhookChanges.js";
import normalizeWebhookPayload from "../framework/src/webhook/normalizeWebhookPayload.js";

test("normalizeWebhookPayload accepts WordPress and WooCommerce changes", () => {
  const wordpress = normalizeWebhookPayload({
    action: "publish",
    changed: [
      {
        id: 10,
        postType: "page",
        slug: "/gioi-thieu/"
      },
      {
        slug: "dien-thoai",
        taxonomy: "product_cat"
      }
    ],
    eventId: "wp-1",
    source: "wordpress"
  });
  const woocommerce = normalizeWebhookPayload({
    action: "update",
    changed: [
      {
        id: 44,
        slug: "iphone-15",
        type: "product"
      }
    ],
    source: "woocommerce"
  });

  assert.equal(wordpress.changed[0].type, "page");
  assert.equal(wordpress.changed[0].slug, "gioi-thieu");
  assert.equal(wordpress.changed[1].type, "term");
  assert.equal(wordpress.changed[1].taxonomy, "product_cat");
  assert.equal(woocommerce.changed[0].type, "product");
});

test("mapWebhookChanges keeps slug-only route hints", () => {
  const payload = normalizeWebhookPayload({
    action: "update",
    changed: [
      {
        id: 44,
        slug: "iphone-15",
        type: "product"
      }
    ],
    source: "woocommerce"
  });
  const changes = mapWebhookChanges(payload);

  assert.deepEqual(changes, [
    {
      id: "44",
      reason: "woocommerce:update:product:iphone-15",
      routeSlug: "iphone-15",
      source: "woocommerce",
      taxonomy: null,
      type: "product"
    }
  ]);
});

test("createRebuildQueue serializes overlapping rebuilds", async () => {
  const calls = [];
  let releaseFirstBuild;
  const firstBuild = new Promise((resolve) => {
    releaseFirstBuild = resolve;
  });
  const queue = createRebuildQueue({
    rebuild: async (request) => {
      calls.push(request);

      if (calls.length === 1) {
        await firstBuild;
      }

      return {
        reason: request.reason
      };
    }
  });

  const first = queue.enqueue({ reason: "first" });
  const second = await queue.enqueue({ reason: "second" });

  assert.equal(second.status, "queued");
  assert.equal(queue.getState().queued, true);

  releaseFirstBuild();
  const firstResult = await first;
  await waitFor(() => calls.length === 2);

  assert.equal(firstResult.status, "built");
  assert.equal(calls[0].reason, "first");
  assert.equal(calls[1].reason, "second");
});

test("createWebhookReceiver verifies secret and enqueues rebuild", async () => {
  const rebuilds = [];
  const receiver = createWebhookReceiver({
    rebuild: async (request) => {
      rebuilds.push(request);

      return {
        ok: true
      };
    },
    secret: "top-secret"
  });
  const unauthorized = await receiver.handle(new Request("http://wpsc.local/webhook/rebuild", {
    body: JSON.stringify({
      action: "update",
      changed: [{ slug: "iphone-15", type: "product" }],
      source: "woocommerce"
    }),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  }));
  const authorized = await receiver.handle(new Request("http://wpsc.local/webhook/rebuild", {
    body: JSON.stringify({
      action: "update",
      changed: [{ slug: "iphone-15", type: "product" }],
      eventId: "woo-1",
      source: "woocommerce"
    }),
    headers: {
      "content-type": "application/json",
      "x-wpsc-webhook-secret": "top-secret"
    },
    method: "POST"
  }));
  const body = await authorized.json();

  assert.equal(unauthorized.status, 401);
  assert.equal(authorized.status, 200);
  assert.equal(body.rebuild, "built");
  assert.equal(body.changes[0].routeSlug, "iphone-15");
  assert.equal(rebuilds.length, 1);
});

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  throw new Error("Timed out waiting for predicate.");
}
