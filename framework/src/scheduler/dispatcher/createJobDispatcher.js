import { JobEvent, JobStatus, assertQueueInterface } from "../contracts/schedulerContracts.js";

export const JOB_DISPATCHER_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createJobDispatcher(options = {}) {
  const queue = assertQueueInterface(options.queue);
  const buildEngine = options.buildEngine;
  const now = options.now || (() => new Date().toISOString());
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  if (!buildEngine || typeof buildEngine.build !== "function") {
    throw new TypeError("Job Dispatcher requires a Build Engine with build().");
  }

  function emit(events, type, payload) {
    const event = { payload, timestamp: now(), type };
    events.push(event);
    onEvent?.(event);
  }

  async function dispatch() {
    const job = queue.next();
    if (!job) return { diagnostics: { errors: [], warnings: [] }, events: [], job: null, ok: true };
    const events = [];
    emit(events, JobEvent.STARTED, { jobId: job.id, siteId: job.siteId, triggerType: job.triggerType });
    try {
      const build = await buildEngine.build({ changed: job.changed, siteId: job.siteId, triggerType: job.triggerType });
      const status = build?.status === "SUCCESS" ? JobStatus.SUCCESS : JobStatus.FAILED;
      const completed = queue.complete(job.id, { diagnostics: build?.diagnostics, status });
      if (!completed.ok) return { ...completed, events, job };
      const type = status === JobStatus.SUCCESS ? JobEvent.COMPLETED : JobEvent.FAILED;
      emit(events, type, { buildId: build?.buildId || null, duration: completed.job.duration, jobId: job.id, siteId: job.siteId });
      return { build, diagnostics: completed.job.diagnostics, events, job: completed.job, ok: status === JobStatus.SUCCESS };
    } catch (error) {
      const diagnostics = { errors: [diagnostic("job.dispatch.failed", error.message)], warnings: [] };
      const completed = queue.complete(job.id, { diagnostics, status: JobStatus.FAILED });
      emit(events, JobEvent.FAILED, { buildId: null, duration: completed.job?.duration ?? null, jobId: job.id, siteId: job.siteId });
      return { diagnostics, events, job: completed.job || job, ok: false };
    }
  }

  return Object.freeze({ dispatch, version: JOB_DISPATCHER_VERSION });
}
