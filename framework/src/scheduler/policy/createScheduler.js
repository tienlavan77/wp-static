import {
  JobStatus,
  JobTrigger,
  SchedulerEvent,
  SchedulerState,
  assertDispatcherInterface,
  assertQueueInterface
} from "../contracts/schedulerContracts.js";

export const SCHEDULER_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createScheduler(options = {}) {
  const queue = assertQueueInterface(options.queue);
  const dispatcher = assertDispatcherInterface(options.dispatcher);
  const now = options.now || (() => new Date().toISOString());
  const retryPolicy = { maxRetries: options.retryPolicy?.maxRetries ?? 0, retryDelayMs: options.retryPolicy?.retryDelayMs ?? 0 };
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  const schedules = [];
  const retryAttempts = new Map();
  const retriedJobs = new Set();
  const siteLocks = new Set();
  let state = SchedulerState.STOPPED;

  function emit(events, type, payload = {}) {
    const event = { payload, timestamp: now(), type };
    events.push(event);
    onEvent?.(event);
  }

  function enqueue(input, events) {
    const siteId = String(input.siteId || "").trim();
    if (siteLocks.has(siteId)) return { diagnostics: { errors: [diagnostic("scheduler.site.locked", "A scheduler operation is already active for this site.")], warnings: [] }, ok: false };
    siteLocks.add(siteId);
    try {
      const queued = queue.enqueue({
        changed: Array.isArray(input.changed) ? input.changed : [],
        changes: Array.isArray(input.changes) ? input.changes : [],
        siteId,
        triggerType: input.triggerType || JobTrigger.MANUAL
      });
      if (queued.ok) emit(events, "job.queued", { jobId: queued.job.id, siteId, triggerType: queued.job.triggerType });
      return queued;
    } finally {
      siteLocks.delete(siteId);
    }
  }

  function addSchedule(schedule = {}) {
    if (typeof schedule.siteId !== "string" || schedule.siteId.trim() === "" || !Number.isFinite(schedule.intervalMs) || schedule.intervalMs <= 0) {
      throw new TypeError("Schedule requires siteId and a positive intervalMs.");
    }
    schedules.push({ intervalMs: schedule.intervalMs, lastRunAt: null, siteId: schedule.siteId.trim() });
  }

  function start() { state = SchedulerState.RUNNING; return state; }
  function pause() { state = SchedulerState.PAUSED; return state; }
  function stop() { state = SchedulerState.STOPPED; return state; }
  function getState() { return state; }

  function trigger(input = {}) {
    const events = [];
    const queued = enqueue(input, events);
    return { ...queued, events };
  }

  async function tick() {
    const events = [];
    if (state !== SchedulerState.RUNNING) return { diagnostics: { errors: [diagnostic("scheduler.tick.unavailable", "Scheduler is not running.")], warnings: [] }, events, ok: false };
    emit(events, SchedulerEvent.TICK);
    const timestamp = Date.parse(now());
    for (const schedule of schedules) {
      if (schedule.lastRunAt === null || timestamp - schedule.lastRunAt >= schedule.intervalMs) {
        const queued = enqueue({ siteId: schedule.siteId, triggerType: JobTrigger.SCHEDULE }, events);
        if (queued.ok) schedule.lastRunAt = timestamp;
      }
    }
    for (const failed of queue.list(JobStatus.FAILED)) {
      if (retriedJobs.has(failed.id)) continue;
      const attempts = retryAttempts.get(failed.id) || 0;
      const failedAt = Date.parse(failed.finishedAt || failed.createdAt || now());
      if (attempts < retryPolicy.maxRetries && timestamp - failedAt >= retryPolicy.retryDelayMs) {
        const queued = enqueue({ changed: failed.changed, changes: failed.changes, siteId: failed.siteId, triggerType: failed.triggerType }, events);
        if (queued.ok) { retryAttempts.set(failed.id, attempts + 1); retriedJobs.add(failed.id); }
      }
    }
    const dispatched = await dispatcher.dispatch();
    return { diagnostics: dispatched.diagnostics || { errors: [], warnings: [] }, dispatched, events, ok: dispatched.ok !== false };
  }

  return Object.freeze({ addSchedule, getState, pause, start, stop, tick, trigger, version: SCHEDULER_VERSION });
}
