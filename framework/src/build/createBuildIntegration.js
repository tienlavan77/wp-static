import { BuildClient } from "./createBuildEngine.js";
import createContentTransitionPlan from "./createContentTransitionPlan.js";

export const BUILD_INTEGRATION_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createBuildIntegration(options = {}) {
  const buildEngine = options.buildEngine;
  const contentReader = options.contentReader;
  const outputPipeline = options.outputPipeline;
  const runtimeV1Builder = options.runtimeV1Builder;
  const dependencyManifestStore = options.dependencyManifestStore;
  const contentSnapshotStore = options.contentSnapshotStore;
  const cache = options.cache;
  const telemetryStore = options.telemetryStore;
  const site = options.site || {};
  if (!buildEngine || !contentReader || !outputPipeline || !runtimeV1Builder) {
    throw new TypeError("Build Integration requires engine, Runtime Content Reader, Runtime V1 Builder, and Output Pipeline.");
  }

  async function build(input = {}) {
    const clock = Date.now(); const phases = {};
    const client = input.client || (input.triggerType === "browser" ? BuildClient.BROWSER : input.triggerType === "cli" ? BuildClient.CLI : BuildClient.DASHBOARD);
    const started = buildEngine.start({ client, siteId: input.siteId });
    if (!started.ok) return started;
    try {
      const transitionPlan = createContentTransitionPlan(input.changes || []);
      const changed = transitionPlan.forceFullBuild ? [] : input.changed || [];
      const dependencyManifest = dependencyManifestStore ? await dependencyManifestStore.load(started.context.siteId) : null;
      const sourceSnapshot = contentSnapshotStore ? await contentSnapshotStore.load(started.context.siteId) : null;
      const source = await contentReader.read({ changed, dependencyManifest, siteId: started.context.siteId, sourceSnapshot });
      phases.source = Date.now() - clock;
      if (!source || !Array.isArray(source.items)) {
        return buildEngine.fail(started.buildId, { diagnostics: { errors: [diagnostic("build.source.content.invalid", "Content Reader must return an items array.")], warnings: [] } });
      }
      const built = await runtimeV1Builder.build({ buildId: started.buildId, changed, collections: source.collections, contents: source.items, dependencyManifest, site: { ...site, siteId: started.context.siteId }, siteId: started.context.siteId, transitionPlan });
      phases.build = Date.now() - clock - phases.source;
      const output = await outputPipeline.write({ assets: built.assets, buildId: started.buildId, pages: [], replace: built.incremental?.fullBuild === true, siteId: started.context.siteId, verify: true });
      if (!output.ok) return buildEngine.fail(started.buildId, { diagnostics: output.diagnostics });
      phases.publish = Date.now() - clock - phases.source - phases.build;
      cache?.activateBuild?.(started.context.siteId, started.buildId);
      // The manifest is a record of publicly published output, never staging.
      if (dependencyManifestStore && built.incremental?.dependencyGraph) {
        await dependencyManifestStore.save({ buildId: started.buildId, dependenciesByRoute: built.incremental.dependencyGraph, siteId: started.context.siteId });
      }
      if (contentSnapshotStore) {
        await contentSnapshotStore.save({ buildId: started.buildId, collections: source.collections || {}, items: source.items, siteId: started.context.siteId });
      }
      await telemetryStore?.record?.(started.context.siteId, { buildId: started.buildId, changedRoutes: built.incremental?.changedRoutes || [], duration: Date.now() - clock, mode: built.incremental?.fullBuild ? "full" : "incremental", pagesWritten: built.result?.pagesWritten ?? null, phases, totalPages: built.result?.totalPages ?? null });
      return buildEngine.finish(started.buildId, { generatedFiles: output.generatedFiles });
    } catch (error) {
      return buildEngine.fail(started.buildId, { diagnostics: { errors: [diagnostic("build.integration.failed", error.message)], warnings: [] } });
    }
  }

  return Object.freeze({ build, version: BUILD_INTEGRATION_VERSION });
}
