import assert from "node:assert/strict";
import test from "node:test";
import createJobQueue from "../src/scheduler/createJobQueue.js";
import createScheduler from "../src/scheduler/createScheduler.js";
import { JobStatus, JobTrigger, SchedulerEvent, SchedulerState } from "../src/scheduler/schedulerContracts.js";

test("Scheduler evaluates due schedules and delegates queued work to injected Dispatcher", async () => {
  const queue = createJobQueue({ createJobId: (() => { let id = 0; return () => `job-${++id}`; })(), now: () => "2026-08-03T00:00:00.000Z" });
  let dispatches = 0;
  const scheduler = createScheduler({ dispatcher: { dispatch: async () => { dispatches += 1; return { diagnostics: { errors: [], warnings: [] }, ok: true }; } }, now: () => "2026-08-03T00:00:00.000Z", queue });
  scheduler.addSchedule({ intervalMs: 60000, siteId: "company-a" });
  assert.equal(scheduler.start(), SchedulerState.RUNNING);
  const result = await scheduler.tick();
  assert.equal(dispatches, 1);
  assert.equal(queue.list(JobStatus.QUEUED).length, 1);
  assert.deepEqual(result.events.map((event) => event.type), [SchedulerEvent.TICK, "job.queued"]);
  assert.equal(scheduler.pause(), SchedulerState.PAUSED);
});

test("Scheduler retries failed jobs through Queue without build logic", async () => {
  const times = ["2026-08-03T00:00:00.000Z", "2026-08-03T00:00:01.000Z", "2026-08-03T00:00:02.000Z"];
  const queue = createJobQueue({ createJobId: (() => { let id = 0; return () => `job-${++id}`; })(), now: () => times.shift() });
  queue.enqueue({ siteId: "company-a", triggerType: JobTrigger.WEBHOOK });
  queue.complete(queue.next().id, { status: JobStatus.FAILED });
  const scheduler = createScheduler({ dispatcher: { dispatch: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true }) }, now: () => "2026-08-03T00:00:03.000Z", queue, retryPolicy: { maxRetries: 1, retryDelayMs: 0 } });
  scheduler.start();
  await scheduler.tick();
  assert.equal(queue.list(JobStatus.QUEUED).length, 1);
});
