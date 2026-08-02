import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import buildSite from "../../builder/buildSite.js";
import compilePreparedSite from "../../core/compilePreparedSite.js";
import loadPlugins from "../../plugins/loadPlugins.js";
import parseChangedItem from "../../builder/planner/parseChangedItem.js";
import planIncrementalBuild from "../../builder/planner/planIncrementalBuild.js";
import createSharedStorefrontBuildConfig from "./createSharedStorefrontBuildConfig.js";

async function files(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, target));
    else result.push({ sourcePath: target, targetPath: path.relative(root, target).replaceAll(path.sep, "/") });
  }
  return result;
}

export default function createRuntimeV1Builder(options = {}) {
  const repository = options.repository;
  if (!repository?.resolveSiteRoot) throw new TypeError("Runtime V1 Builder requires a Site Repository.");
  return Object.freeze({
    async build(input = {}) {
      const root = repository.resolveSiteRoot(input.siteId);
      const outputDir = path.join(root, "storage", "tmp", "builder-v1-full", input.buildId);
      await mkdir(outputDir, { recursive: true });
      const config = createSharedStorefrontBuildConfig({ outputDir, plugins: input.plugins || [], routing: { redirects: input.transitionPlan?.redirects || [] }, site: { ...(input.site || {}), siteId: input.siteId } });
      const plugins = await loadPlugins(config, { projectDir: config._paths.projectDir });
      const plan = await compilePreparedSite({ collections: input.collections || {}, config, contents: input.contents || [], plugins });
      const changedItems = (input.changed || []).map(parseChangedItem);
      const incremental = planIncrementalBuild(plan, changedItems, {
        dependencyManifest: input.dependencyManifest,
        // Runtime requires a previously published snapshot before it can trust
        // targeted route selection. The generic Builder contract remains intact.
        requirePersistedDependencyManifest: changedItems.length > 0
      });
      const result = await buildSite(plan, {
        config,
        incremental,
        outputDir,
        publicDir: config._paths.publicDir,
        site: config.site,
        siteId: input.siteId,
        themeAssetsDir: plan.theme.assetsDir
      });
      return Object.freeze({ assets: Object.freeze(await files(outputDir)), incremental: { ...incremental, transitionPlan: input.transitionPlan || null }, plan, result });
    }
  });
}
