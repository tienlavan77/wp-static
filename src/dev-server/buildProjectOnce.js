import path from "node:path";
import buildSite from "../builder/buildSite.js";
import compile from "../core/compile.js";
import loadConfig from "../core/loadConfig.js";

export default async function buildProjectOnce(projectArg, options = {}) {
  const projectDir = path.resolve(projectArg);
  const cacheBust = options.cacheBust ?? Date.now();
  const config = await loadConfig(projectDir);
  const sitePlan = await compile(config, {
    cacheBust,
    projectDir
  });
  const result = await buildSite(sitePlan, {
    config,
    outputDir: config._paths.outputDir,
    publicDir: config._paths.publicDir ?? undefined,
    site: config.site,
    themeAssetsDir: sitePlan.theme?.assetsDir ?? undefined
  });

  return {
    config,
    projectDir,
    result,
    sitePlan
  };
}
