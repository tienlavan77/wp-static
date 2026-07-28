import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SiteState } from "../site/createSiteMetadata.js";
import { JobTrigger } from "../scheduler/schedulerContracts.js";

export const FIRST_BUILD_CONTROLLER_VERSION = "1.0";

function diagnostic(code, message) { return { code, message, severity: "error" }; }

export default function createFirstBuildController(options = {}) {
  const repository = options.repository;
  const scheduler = options.scheduler;
  const stateManager = options.stateManager;
  if (!repository || typeof repository.readMetadata !== "function" || typeof repository.writeMetadata !== "function" || !scheduler || typeof scheduler.trigger !== "function" || typeof scheduler.tick !== "function" || !stateManager) throw new TypeError("First Build Controller requires Repository, Scheduler, and Site State Manager.");

  async function build(siteId) {
    try {
      const metadata = await repository.readMetadata(siteId);
      const started = stateManager.transition(metadata, SiteState.BUILDING, { reason: "dashboard.first_build" });
      if (!started.ok) return { diagnostics: { errors: [started.error], warnings: [] }, ok: false };
      await repository.writeMetadata(siteId, started.metadata);
      const queued = scheduler.trigger({ siteId, triggerType: JobTrigger.BROWSER });
      if (!queued.ok) return fail(siteId, started.metadata, queued.diagnostics);
      const tick = await scheduler.tick();
      const buildResult = tick.dispatched?.build;
      if (!tick.ok || buildResult?.status !== "SUCCESS") {
        return fail(siteId, started.metadata, buildResult?.diagnostics || tick.diagnostics);
      }
      const completed = stateManager.transition(started.metadata, SiteState.RUNNING, { reason: "dashboard.first_build.completed" });
      await repository.writeMetadata(siteId, completed.metadata);
      const buildPath = path.join(repository.resolveSiteRoot(siteId), "config", "build.json");
      await mkdir(path.dirname(buildPath), { recursive: true });
      await writeFile(buildPath, `${JSON.stringify({ buildId: buildResult.buildId, generatedFiles: buildResult.generatedFiles, status: buildResult.status }, null, 2)}\n`, "utf8");
      return { build: buildResult, buildPath, diagnostics: { errors: [], warnings: [] }, metadata: completed.metadata, ok: true };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("runtime.first_build.failed", error.message)], warnings: [] }, ok: false };
    }
  }

  async function fail(siteId, metadata, diagnostics) {
    const failed = stateManager.transition(metadata, SiteState.ERROR, { reason: "dashboard.first_build.failed" });
    if (failed.ok) await repository.writeMetadata(siteId, failed.metadata);
    return { diagnostics: diagnostics || { errors: [diagnostic("runtime.first_build.failed", "First Build failed.")], warnings: [] }, metadata: failed.metadata || metadata, ok: false };
  }
  return Object.freeze({ build, version: FIRST_BUILD_CONTROLLER_VERSION });
}
