import assert from "node:assert/strict";
import test from "node:test";
import {
  JobEvent,
  JobStatus,
  JobTrigger,
  SchedulerEvent,
  SchedulerState,
  assertDispatcherInterface,
  assertQueueInterface,
  assertSchedulerInterface,
  createJob
} from "../framework/src/scheduler/contracts/schedulerContracts.js";

test("Scheduler contracts create immutable jobs with stable lifecycle metadata", () => {
  const result = createJob({ createdAt: "2026-07-31T00:00:00.000Z", id: "job-1", siteId: "company-a", triggerType: JobTrigger.WEBHOOK });
  assert.equal(result.ok, true);
  assert.equal(result.job.status, JobStatus.QUEUED);
  assert.equal(Object.isFrozen(result.job), true);
  assert.equal(SchedulerState.STOPPED, "STOPPED");
  assert.equal(SchedulerEvent.TICK, "scheduler.tick");
  assert.equal(JobEvent.QUEUED, "job.queued");
});

test("Scheduler contracts validate interfaces and shared diagnostics", () => {
  assert.equal(createJob({}).diagnostics.errors[0].severity, "error");
  assert.doesNotThrow(() => assertSchedulerInterface({ start() {}, stop() {}, tick() {} }));
  assert.doesNotThrow(() => assertQueueInterface({ enqueue() {}, next() {} }));
  assert.doesNotThrow(() => assertDispatcherInterface({ dispatch() {} }));
  assert.throws(() => assertDispatcherInterface({}), /dispatch/);
});
