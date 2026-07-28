import { randomUUID } from "node:crypto";
import { JobStatus, createJob } from "./schedulerContracts.js";

export const JOB_QUEUE_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createJobQueue(options = {}) {
  const createId = options.createJobId || randomUUID;
  const now = options.now || (() => new Date().toISOString());
  const pending = [];
  const running = new Map();
  const finished = new Map();

  function activeSite(siteId) {
    return pending.some((job) => job.siteId === siteId) || [...running.values()].some((job) => job.siteId === siteId);
  }

  function enqueue(input = {}) {
    const created = createJob({ ...input, createdAt: input.createdAt || now(), id: input.id || createId(), status: JobStatus.QUEUED });
    if (!created.ok) return created;
    if (activeSite(created.job.siteId)) {
      return { diagnostics: { errors: [diagnostic("job.queue.site.active", "A build job is already active for this site.")], warnings: [] }, ok: false };
    }
    pending.push(created.job);
    return { diagnostics: { errors: [], warnings: [] }, job: created.job, ok: true };
  }

  function next() {
    const queued = pending.shift();
    if (!queued) return null;
    const claimed = createJob({ ...queued, startedAt: now(), status: JobStatus.RUNNING }).job;
    running.set(claimed.id, claimed);
    return claimed;
  }

  function complete(jobId, input = {}) {
    const job = running.get(jobId);
    if (!job) return { diagnostics: { errors: [diagnostic("job.queue.running.not_found", "Running job was not found.")], warnings: [] }, ok: false };
    const finishedAt = input.finishedAt || now();
    const status = input.status === JobStatus.FAILED ? JobStatus.FAILED : JobStatus.SUCCESS;
    const completed = createJob({
      ...job,
      diagnostics: input.diagnostics || { errors: [], warnings: [] },
      duration: Date.parse(finishedAt) - Date.parse(job.startedAt),
      finishedAt,
      status
    }).job;
    running.delete(jobId);
    finished.set(jobId, completed);
    return { diagnostics: { errors: [], warnings: [] }, job: completed, ok: true };
  }

  function list(status) {
    if (status === JobStatus.QUEUED) return [...pending];
    if (status === JobStatus.RUNNING) return [...running.values()];
    if (status === JobStatus.SUCCESS || status === JobStatus.FAILED || status === "FINISHED") return [...finished.values()];
    return [...pending, ...running.values(), ...finished.values()];
  }

  return Object.freeze({ complete, enqueue, list, next, version: JOB_QUEUE_VERSION });
}
