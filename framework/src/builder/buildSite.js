import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import copyPublicAssets from "./copyPublicAssets.js";
import createBuildManifest from "./createBuildManifest.js";
import { BuildError } from "../shared/errors.js";
import processAssetPipeline from "./assets/processAssetPipeline.js";
import createPluginContext from "../plugins/createPluginContext.js";
import { runPluginEvent } from "../plugins/runPluginHook.js";
import generateRobotsTxt from "./seo/generateRobotsTxt.js";
import generateSitemap from "./seo/generateSitemap.js";
import writeRouteDataOutputs from "./data/writeRouteDataOutputs.js";
import writeNormalizedContentStore from "./data/writeNormalizedContentStore.js";
import writeFragmentOutputs from "./fragments/writeFragmentOutputs.js";
import writeAdminApp from "../admin/writeAdminApp.js";
import writeTemplateManifest from "./templates/writeTemplateManifest.js";
import writeSearchIndex from "./search/writeSearchIndex.js";
import writeMediaManifest from "../media/writeMediaManifest.js";
import writeRouteManifest from "../routing/writeRouteManifest.js";
import createProgressReporter from "../progress/createProgressReporter.js";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";
  const progress = createProgressReporter(options.onProgress);
  const plugins = sitePlan.plugins ?? [];
  const incremental = options.incremental ?? null;
  const pagesToWrite = incremental?.fullBuild === false
    ? sitePlan.pages.filter((page) => incremental.changedRoutes.includes(page.route.path))
    : sitePlan.pages;
  const pluginContext = createPluginContext(options.config ?? {}, {
    projectDir: options.config?._paths?.projectDir
  });

  try {
    progress("output:prepare", `Preparing output directory: ${outputDir}`);
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

  progress("assets:copy", "Copying public and theme assets");
  const copiedPublicAssets = await copyPublicAssets(options.publicDir, outputDir);
  const copiedThemeAssets = await copyPublicAssets(options.themeAssetsDir, path.join(outputDir, "theme"));
  progress("assets:process", `Processing assets for ${pagesToWrite.length} pages`);
  const assetPipeline = await processAssetPipeline(createAssetSitePlan(sitePlan, pagesToWrite, {
    incremental
  }), {
    assetConcurrency: options.assetConcurrency,
    cacheDir: options.assetCacheDir,
    outputDir
  });
  progress("assets:finish", `Assets ready: ${assetPipeline.stats.total} total, ${assetPipeline.stats.cached} cached, ${assetPipeline.stats.downloaded} downloaded`);

  progress("html:write", `Writing ${pagesToWrite.length} HTML pages`);
  for (const page of pagesToWrite) {
    const pageHtml = assetPipeline.rewriteHtml(page.html);
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, pageHtml, "utf8");
    await writeRouteServeAlias(page, pageHtml, {
      outputDir
    });
  }

  progress("fragments:write", `Writing fragments for ${pagesToWrite.length} routes`);
  const fragmentOutputs = await writeFragmentOutputs(pagesToWrite.map((page) => ({
    ...page,
    html: assetPipeline.rewriteHtml(page.html)
  })), {
    outputDir
  });
  progress("route-data:write", `Writing route JSON for ${pagesToWrite.length} routes`);
  const routeData = await writeRouteDataOutputs(sitePlan, {
    outputDir,
    routesToWrite: pagesToWrite.map((page) => page.route),
    site: options.site
  });
  progress("search:write", "Writing search index");
  const searchIndex = await writeSearchIndex(sitePlan, {
    outputDir,
    site: options.site,
    siteId: options.siteId
  });
  progress("content-store:write", "Writing normalized content store");
  const contentStore = await writeNormalizedContentStore(sitePlan, {
    outputDir,
    site: options.site
  });
  progress("media:manifest", "Writing normalized media manifest");
  const mediaManifest = await writeMediaManifest(sitePlan, {
    assetMap: assetPipeline.map,
    outputDir,
    site: options.site,
    siteId: options.siteId
  });
  progress("routes:manifest", "Writing Site route manifest");
  const routeManifest = await writeRouteManifest(sitePlan, {
    outputDir,
    site: options.site,
    siteId: options.siteId
  });
  progress("templates:write", "Writing template manifest");
  const templateManifest = await writeTemplateManifest({
    config: options.config,
    outputDir,
    projectDir: options.config?._paths?.projectDir
  });
  progress("seo:write", "Writing SEO outputs");
  const seoOutputs = await writeSeoOutputs(sitePlan, outputDir, options);
  progress("runtime:copy", "Copying runtime assets");
  await copyBuilderRuntimeAssets(outputDir);
  progress("admin:write", "Writing admin app");
  const adminApp = await writeAdminApp(outputDir, {
    config: options.config
  });

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
    searchIndex,
    contentStore,
    mediaManifest,
    routeManifest,
    templateManifest,
    fragmentOutputs,
    adminApp,
    totalPages: sitePlan.pages.length,
    outputDir
  };
  const manifest = createBuildManifest(sitePlan, buildResult, options);

  await mkdir(path.dirname(buildResult.manifestPath), { recursive: true });
  progress("manifest:write", "Writing build manifests");
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

async function writeRouteServeAlias(page, html, options = {}) {
  if (page.route.path === "/" || page.route.path.endsWith("/")) {
    return null;
  }

  const slug = page.route.path.replace(/^\/+|\/+$/g, "");

  if (!slug || slug.includes("..")) {
    return null;
  }

  const aliasPath = path.join(options.outputDir, slug, "index.html");
  await mkdir(path.dirname(aliasPath), { recursive: true });
  await writeFile(aliasPath, html, "utf8");

  return aliasPath;
}

export async function copyBuilderRuntimeAssets(outputDir) {
  const source = new URL("../runtime/browser/enhanced-navigation.js", import.meta.url);
  const frontendSource = new URL("../runtime/browser/frontend", import.meta.url);
  await copyFile(source, path.join(outputDir, "wpsc-enhanced-navigation.js"));
  await cp(frontendSource, path.join(outputDir, "frontend"), { recursive: true });
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
