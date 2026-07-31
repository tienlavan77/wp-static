import path from "node:path";
import buildSite from "../builder/buildSite.js";
import compile from "../core/compile.js";
import loadConfig from "../core/loadConfig.js";
import parseChangedItem from "../builder/planner/parseChangedItem.js";
import planIncrementalBuild from "../builder/planner/planIncrementalBuild.js";
import createProgressReporter from "../progress/createProgressReporter.js";
import assertPreviewAccess from "../preview/assertPreviewAccess.js";
import createContentValidationReport from "../builder/report/createContentValidationReport.js";

export default async function buildProjectOnce(projectArg, options = {}) {
  const startedAt = Date.now();
  const progress = createProgressReporter(options.onProgress);
  const projectDir = path.resolve(projectArg);
  const cacheBust = options.cacheBust ?? Date.now();
  progress("config", `Loading project config: ${projectDir}`);
  const config = await loadConfig(projectDir);
  assertPreviewAccess(config, options);
  progress("compile:start", createCompileStartMessage(options));
  const sitePlan = await compile(config, {
    cacheBust,
    cacheDir: path.join(projectDir, ".wpsc", "cache"),
    disableRouteRenderCache: options.disableRouteRenderCache,
    freshContent: options.freshContent,
    preview: options.preview,
    projectDir
  });
  progress("compile:finish", createCompileFinishMessage(sitePlan));
  const changedItems = (options.changed ?? []).map(parseChangedItem);
  const incremental = planIncrementalBuild(sitePlan, changedItems);
  progress("plan", createPlanMessage(incremental, sitePlan));
  const result = await buildSite(sitePlan, {
    config,
    incremental,
    onProgress: progress,
    outputDir: config._paths.outputDir,
    publicDir: config._paths.publicDir ?? undefined,
    site: config.site,
    themeAssetsDir: sitePlan.theme?.assetsDir ?? undefined
  });
  progress("finish", createFinishMessage(result, Date.now() - startedAt));

  return {
    config,
    incremental,
    report: createContentValidationReport(sitePlan),
    projectDir,
    result,
    sitePlan
  };
}

function createCompileStartMessage(options = {}) {
  const flags = [
    options.freshContent ? "fresh data" : "cached data allowed",
    options.disableRouteRenderCache ? "route render cache disabled" : "route render cache allowed"
  ];

  return `Source fetch and compile started (${flags.join(", ")})`;
}

function createCompileFinishMessage(sitePlan) {
  const cache = sitePlan.cache ?? {};

  return [
    `Source fetch and compile finished`,
    `${sitePlan.routes?.length ?? 0} routes`,
    `${sitePlan.graph?.contents?.items?.length ?? 0} contents`,
    `${sitePlan.graph?.terms?.items?.length ?? 0} terms`,
    `content cache ${cache.contentCacheHit ? "hit" : "miss"}`,
    `collection cache ${cache.collectionCacheHit ? "hit" : "miss"}`
  ].join(": ");
}

function createPlanMessage(incremental, sitePlan) {
  if (incremental.fullBuild) {
    return `Build plan ready: full build, ${sitePlan.pages.length} pages`;
  }

  return `Build plan ready: ${incremental.affectedPages.length} affected pages`;
}

function createFinishMessage(result, durationMs) {
  const seconds = (durationMs / 1000).toFixed(1);

  return [
    `Build finished in ${seconds}s`,
    `${result.pagesWritten} pages`,
    `${result.routeData?.routesWritten ?? 0} route data`,
    `${result.fragmentOutputs?.fragmentsWritten ?? 0} fragments`
  ].join(": ");
}
