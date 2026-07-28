import assert from "node:assert/strict";
import test from "node:test";
import createJobDispatcher from "../src/scheduler/createJobDispatcher.js";
import createJobQueue from "../src/scheduler/createJobQueue.js";
import { JobEvent, JobStatus, JobTrigger } from "../src/scheduler/schedulerContracts.js";

test("Job Dispatcher claims a queued job, calls injected Build Engine, and completes Queue state", async () => {
  const queue = createJobQueue({ createJobId: () => "job-1", now: () => "2026-08-02T00:00:00.000Z" });
  queue.enqueue({ siteId: "company-a", triggerType: JobTrigger.WEBHOOK });
  const calls = [];
  const dispatcher = createJobDispatcher({
    buildEngine: { build: async (input) => { calls.push(input); return { buildId: "build-1", diagnostics: { errors: [], warnings: [] }, status: "SUCCESS" }; } },
    now: () => "2026-08-02T00:00:02.000Z",
    queue
  });
  const result = await dispatcher.dispatch();
  assert.equal(result.ok, true);
  assert.equal(result.job.status, JobStatus.SUCCESS);
  assert.deepEqual(calls, [{ siteId: "company-a", triggerType: JobTrigger.WEBHOOK }]);
  assert.deepEqual(result.events.map((event) => event.type), [JobEvent.STARTED, JobEvent.COMPLETED]);
});

test("Job Dispatcher records a failed job when Build Engine throws", async () => {
  const queue = createJobQueue({ createJobId: () => "job-1" });
  queue.enqueue({ siteId: "company-a", triggerType: JobTrigger.CLI });
  const result = await createJobDispatcher({ buildEngine: { build: async () => { throw new Error("Build unavailable"); } }, queue }).dispatch();
  assert.equal(result.ok, false);
  assert.equal(result.job.status, JobStatus.FAILED);
  assert.equal(result.diagnostics.errors[0].code, "job.dispatch.failed");
});
