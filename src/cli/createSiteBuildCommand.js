import { JobTrigger } from "../scheduler/schedulerContracts.js";

export default function createSiteBuildCommand(options = {}) {
  const scheduler = options.scheduler;
  const write = options.write || (() => {});
  if (!scheduler || typeof scheduler.trigger !== "function") throw new TypeError("Site build command requires a Scheduler.");
  return Object.freeze({
    run(input = {}) {
      const result = scheduler.trigger({ siteId: input.siteId, triggerType: JobTrigger.CLI });
      if (result.ok) write(`Build job queued: ${result.job.id}`);
      else for (const item of result.diagnostics.errors || []) write(`[${item.severity}] ${item.code}: ${item.message}`);
      return result;
    }
  });
}
