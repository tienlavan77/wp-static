import assert from "node:assert/strict";
import test from "node:test";
import createJobQueue from "../framework/src/scheduler/queue/createJobQueue.js";
import { JobStatus, JobTrigger } from "../framework/src/scheduler/contracts/schedulerContracts.js";

test("Job Queue stores immutable pending, running, and finished snapshots", () => {
  const times = ["2026-08-01T00:00:00.000Z", "2026-08-01T00:00:02.000Z", "2026-08-01T00:00:04.000Z"];
  const queue = createJobQueue({ createJobId: () => "job-1", now: () => times.shift() });
  const queued = queue.enqueue({ siteId: "company-a", triggerType: JobTrigger.CLI });
  assert.equal(queued.job.status, JobStatus.QUEUED);
  assert.equal(Object.isFrozen(queued.job), true);
  assert.equal(queue.list(JobStatus.QUEUED).length, 1);
  const running = queue.next();
  assert.equal(running.status, JobStatus.RUNNING);
  const completed = queue.complete(running.id);
  assert.equal(completed.job.status, JobStatus.SUCCESS);
  assert.equal(completed.job.duration, 2000);
  assert.equal(queue.list("FINISHED").length, 1);
});

test("Job Queue prevents simultaneous active jobs for one site without dispatching", () => {
  const queue = createJobQueue({ createJobId: () => "job-1" });
  assert.equal(queue.enqueue({ siteId: "company-a", triggerType: JobTrigger.MANUAL }).ok, true);
  const duplicate = queue.enqueue({ id: "job-2", siteId: "company-a", triggerType: JobTrigger.WEBHOOK });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.diagnostics.errors[0].code, "job.queue.site.active");
});
