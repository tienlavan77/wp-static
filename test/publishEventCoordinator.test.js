import assert from "node:assert/strict";
import test from "node:test";
import createPublishEventCoordinator from "../framework/src/publishing/createPublishEventCoordinator.js";
import createScheduler from "../framework/src/scheduler/policy/createScheduler.js";

test("Publishing Coordinator normalizes WordPress changes and submits one Scheduler request", () => {
  const calls = [];
  const coordinator = createPublishEventCoordinator({
    scheduler: {
      trigger(input) {
        calls.push(input);
        return { diagnostics: { errors: [], warnings: [] }, job: { id: "job-1" }, ok: true };
      }
    }
  });
  const result = coordinator.publish({
    payload: {
      action: "publish",
      changed: [{ id: 12, postType: "post", slug: "welcome" }],
      eventId: "wordpress-12-1",
      receivedAt: "2026-07-30T10:00:00.000Z",
      source: "wordpress"
    },
    siteId: "site-a"
  });

  assert.equal(result.events[0].schema, "wpsc.publish-event");
  assert.equal(result.events[0].siteId, "site-a");
  assert.equal(result.events[0].entityType, "post");
  assert.equal(result.events[0].entityId, "12");
  assert.equal(result.events[0].changeType, "publish");
  assert.equal(result.events[0].timestamp, "2026-07-30T10:00:00.000Z");
  assert.deepEqual(calls, [{
    changed: ["post:welcome"],
    siteId: "site-a",
    triggerType: "webhook"
  }]);
});

test("Publishing Coordinator suppresses duplicate event delivery within its idempotency window", () => {
  let schedulerCalls = 0;
  let currentTime = 1000;
  const coordinator = createPublishEventCoordinator({
    idempotencyTtlMs: 5000,
    nowMs: () => currentTime,
    scheduler: {
      trigger() {
        schedulerCalls += 1;
        return { job: { id: `job-${schedulerCalls}` }, ok: true };
      }
    }
  });
  const input = {
    payload: {
      action: "update",
      changed: [{ id: 9, slug: "about", type: "page" }],
      eventId: "wp-event-9",
      source: "wordpress"
    },
    siteId: "site-a"
  };

  assert.equal(coordinator.publish(input).duplicate, false);
  assert.equal(coordinator.publish(input).duplicate, true);
  assert.equal(schedulerCalls, 1);
  currentTime = 7000;
  assert.equal(coordinator.publish(input).duplicate, false);
  assert.equal(schedulerCalls, 2);
});

test("Scheduler preserves publishing change hints in the queued Build Job", () => {
  const enqueued = [];
  const queue = {
    enqueue(input) {
      enqueued.push(input);
      return { job: { ...input, id: "job-1" }, ok: true };
    },
    list: () => [],
    next: () => null
  };
  const scheduler = createScheduler({
    dispatcher: { dispatch: async () => ({ ok: true }) },
    queue
  });

  scheduler.trigger({ changed: ["post:welcome"], siteId: "site-a", triggerType: "webhook" });

  assert.deepEqual(enqueued, [{
    changed: ["post:welcome"],
    siteId: "site-a",
    triggerType: "webhook"
  }]);
});
