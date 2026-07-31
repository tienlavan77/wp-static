import { JobTrigger } from "../scheduler/contracts/schedulerContracts.js";

export default function createBuildApi(options = {}) {
  const scheduler = options.scheduler;
  if (!scheduler || typeof scheduler.trigger !== "function") throw new TypeError("Build API requires a Scheduler.");
  return Object.freeze({
    build(request = {}) {
      const result = scheduler.trigger({ siteId: request.siteId, triggerType: JobTrigger.BROWSER });
      return result.ok ? { diagnostics: result.diagnostics, job: result.job, ok: true } : { diagnostics: result.diagnostics, ok: false };
    }
  });
}
