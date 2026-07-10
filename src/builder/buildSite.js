import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import copyPublicAssets from "./copyPublicAssets.js";
import createBuildManifest from "./createBuildManifest.js";
import { BuildError } from "../shared/errors.js";
import processAssetPipeline from "../assets/processAssetPipeline.js";
import createPluginContext from "../plugins/createPluginContext.js";
import { runPluginEvent } from "../plugins/runPluginHook.js";
import generateRobotsTxt from "../seo/generateRobotsTxt.js";
import generateSitemap from "../seo/generateSitemap.js";
import writeRouteDataOutputs from "../data/writeRouteDataOutputs.js";
import writeNormalizedContentStore from "../data/writeNormalizedContentStore.js";
import writeFragmentOutputs from "../fragments/writeFragmentOutputs.js";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";
  const plugins = sitePlan.plugins ?? [];
  const incremental = options.incremental ?? null;
  const pagesToWrite = incremental?.fullBuild === false
    ? sitePlan.pages.filter((page) => incremental.changedRoutes.includes(page.route.path))
    : sitePlan.pages;
  const pluginContext = createPluginContext(options.config ?? {}, {
    projectDir: options.config?._paths?.projectDir
  });

  try {
    if (incremental?.fullBuild !== false) {
      await rm(outputDir, { recursive: true, force: true });
    }

    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    throw new BuildError(`Unable to prepare output directory "${outputDir}": ${error.message}`);
  }

  await runPluginEvent(plugins, "buildStart", {
    options,
    outputDir,
    sitePlan
  }, pluginContext);

  const copiedPublicAssets = await copyPublicAssets(options.publicDir, outputDir);
  const copiedThemeAssets = await copyPublicAssets(options.themeAssetsDir, path.join(outputDir, "theme"));
  const assetPipeline = await processAssetPipeline(createAssetSitePlan(sitePlan, pagesToWrite, {
    incremental
  }), {
    assetConcurrency: options.assetConcurrency,
    cacheDir: options.assetCacheDir,
    outputDir
  });

  for (const page of pagesToWrite) {
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, assetPipeline.rewriteHtml(page.html), "utf8");
  }

  const fragmentOutputs = await writeFragmentOutputs(pagesToWrite.map((page) => ({
    ...page,
    html: assetPipeline.rewriteHtml(page.html)
  })), {
    outputDir
  });
  const routeData = await writeRouteDataOutputs(sitePlan, {
    outputDir,
    routesToWrite: pagesToWrite.map((page) => page.route),
    site: options.site
  });
  const contentStore = await writeNormalizedContentStore(sitePlan, {
    outputDir,
    site: options.site
  });
  const seoOutputs = await writeSeoOutputs(sitePlan, outputDir, options);
  await copyRuntimeAssets(outputDir);

  const buildResult = {
    copiedPublicAssets,
    copiedThemeAssets,
    assetManifestPath: path.join(outputDir, ".wpsc", "assets.json"),
    assetsDownloaded: assetPipeline.entries.length,
    assetStats: assetPipeline.stats,
    assetPipeline,
    changedRoutes: incremental?.changedRoutes ?? [],
    fullBuild: incremental?.fullBuild !== false,
    inputHash: incremental?.inputHash ?? null,
    manifestPath: path.join(outputDir, ".wpsc", "manifest.json"),
    pagesWritten: pagesToWrite.length,
    seoOutputs,
    routeData,
    contentStore,
    fragmentOutputs,
    totalPages: sitePlan.pages.length,
    outputDir
  };
  const manifest = createBuildManifest(sitePlan, buildResult, options);

  await mkdir(path.dirname(buildResult.manifestPath), { recursive: true });
  await writeFile(buildResult.assetManifestPath, `${JSON.stringify({
    version: 1,
    assets: assetPipeline.entries,
    stats: assetPipeline.stats
  }, null, 2)}\n`, "utf8");
  await writeFile(buildResult.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await runPluginEvent(plugins, "buildEnd", {
    manifest,
    result: buildResult,
    sitePlan
  }, pluginContext);

  return buildResult;
}

async function copyRuntimeAssets(outputDir) {
  const source = new URL("../runtime/enhanced-navigation.js", import.meta.url);
  await copyFile(source, path.join(outputDir, "wpsc-enhanced-navigation.js"));
}

function createAssetSitePlan(sitePlan, pagesToWrite, options = {}) {
  if (options.incremental?.fullBuild !== false) {
    return sitePlan;
  }

  return {
    ...sitePlan,
    graph: {
      ...sitePlan.graph,
      media: {
        items: []
      }
    },
    pages: pagesToWrite
  };
}

async function writeSeoOutputs(sitePlan, outputDir, options) {
  const outputs = [];
  const sitemap = generateSitemap(sitePlan, options);

  if (sitemap) {
    await writeFile(path.join(outputDir, "sitemap.xml"), `${sitemap}\n`, "utf8");
    outputs.push("sitemap.xml");
  }

  const robotsTxt = generateRobotsTxt(options);
  await writeFile(path.join(outputDir, "robots.txt"), robotsTxt, "utf8");
  outputs.push("robots.txt");

  return outputs;
}
