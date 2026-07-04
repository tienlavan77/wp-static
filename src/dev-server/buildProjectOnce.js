import path from "node:path";
import buildSite from "../builder/buildSite.js";
import compile from "../core/compile.js";
import loadConfig from "../core/loadConfig.js";
import parseChangedItem from "../incremental/parseChangedItem.js";
import planIncrementalBuild from "../incremental/planIncrementalBuild.js";
import assertPreviewAccess from "../preview/assertPreviewAccess.js";
import createContentValidationReport from "../report/createContentValidationReport.js";

export default async function buildProjectOnce(projectArg, options = {}) {
  const projectDir = path.resolve(projectArg);
  const cacheBust = options.cacheBust ?? Date.now();
  const config = await loadConfig(projectDir);
  assertPreviewAccess(config, options);
  const sitePlan = await compile(config, {
    cacheBust,
    preview: options.preview,
    projectDir
  });
  const changedItems = (options.changed ?? []).map(parseChangedItem);
  const incremental = planIncrementalBuild(sitePlan, changedItems);
  const result = await buildSite(sitePlan, {
    config,
    incremental,
    outputDir: config._paths.outputDir,
    publicDir: config._paths.publicDir ?? undefined,
    site: config.site,
    themeAssetsDir: sitePlan.theme?.assetsDir ?? undefined
  });

  return {
    config,
    incremental,
    report: createContentValidationReport(sitePlan),
    projectDir,
    result,
    sitePlan
  };
}
