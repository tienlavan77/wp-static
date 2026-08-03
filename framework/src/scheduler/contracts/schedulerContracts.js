import deepFreeze from "../../shared/deepFreeze.js";

export const SCHEDULER_CONTRACT_VERSION = "1.0";

export const SchedulerState = Object.freeze({
  PAUSED: "PAUSED",
  RUNNING: "RUNNING",
  STOPPED: "STOPPED"
});

export const JobStatus = Object.freeze({
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS"
});

export const JobTrigger = Object.freeze({
  BROWSER: "browser",
  CLI: "cli",
  MANUAL: "manual",
  SCHEDULE: "schedule",
  WEBHOOK: "webhook"
});

export const SchedulerEvent = Object.freeze({
  STARTED: "scheduler.started",
  STOPPED: "scheduler.stopped",
  TICK: "scheduler.tick"
});

export const JobEvent = Object.freeze({
  COMPLETED: "job.completed",
  FAILED: "job.failed",
  QUEUED: "job.queued",
  STARTED: "job.started"
});

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export function validateJob(job = {}) {
  const errors = [];
  if (typeof job.id !== "string" || job.id.trim() === "") errors.push(diagnostic("job.id.required", "Job id is required."));
  if (typeof job.siteId !== "string" || job.siteId.trim() === "") errors.push(diagnostic("job.site_id.required", "Job site id is required."));
  if (!Object.values(JobTrigger).includes(job.triggerType)) errors.push(diagnostic("job.trigger.invalid", "Job trigger type is invalid."));
  if (!Object.values(JobStatus).includes(job.status)) errors.push(diagnostic("job.status.invalid", "Job status is invalid."));
  return { errors, ok: errors.length === 0 };
}

export function createJob(input = {}) {
  const job = deepFreeze({
    changed: deepFreeze(Array.isArray(input.changed) ? [...input.changed] : []),
    changes: deepFreeze(Array.isArray(input.changes) ? [...input.changes] : []),
    createdAt: input.createdAt || null,
    diagnostics: deepFreeze(input.diagnostics || { errors: [], warnings: [] }),
    duration: input.duration ?? null,
    finishedAt: input.finishedAt || null,
    id: typeof input.id === "string" ? input.id.trim() : "",
    siteId: typeof input.siteId === "string" ? input.siteId.trim() : "",
    startedAt: input.startedAt || null,
    status: input.status || JobStatus.QUEUED,
    triggerType: String(input.triggerType || "").trim().toLowerCase()
  });
  const validation = validateJob(job);
  return { diagnostics: { errors: validation.errors, warnings: [] }, job, ok: validation.ok };
}

export function assertSchedulerInterface(scheduler) {
  if (!scheduler || typeof scheduler.start !== "function" || typeof scheduler.stop !== "function" || typeof scheduler.tick !== "function") {
    throw new TypeError("Scheduler must implement start(), stop(), and tick().");
  }
  return scheduler;
}

export function assertQueueInterface(queue) {
  if (!queue || typeof queue.enqueue !== "function" || typeof queue.next !== "function") {
    throw new TypeError("Job Queue must implement enqueue() and next().");
  }
  return queue;
}

export function assertDispatcherInterface(dispatcher) {
  if (!dispatcher || typeof dispatcher.dispatch !== "function") {
    throw new TypeError("Job Dispatcher must implement dispatch().");
  }
  return dispatcher;
}
