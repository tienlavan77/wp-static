import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import copyPublicAssets from "./copyPublicAssets.js";
import createBuildManifest from "./createBuildManifest.js";
import { BuildError } from "../shared/errors.js";
import generateRobotsTxt from "../seo/generateRobotsTxt.js";
import generateSitemap from "../seo/generateSitemap.js";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";

  try {
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    throw new BuildError(`Unable to prepare output directory "${outputDir}": ${error.message}`);
  }

  const copiedPublicAssets = await copyPublicAssets(options.publicDir, outputDir);
  const copiedThemeAssets = await copyPublicAssets(options.themeAssetsDir, path.join(outputDir, "theme"));

  for (const page of sitePlan.pages) {
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, page.html, "utf8");
  }

  const seoOutputs = await writeSeoOutputs(sitePlan, outputDir, options);

  const buildResult = {
    copiedPublicAssets,
    copiedThemeAssets,
    manifestPath: path.join(outputDir, ".wpsc", "manifest.json"),
    pagesWritten: sitePlan.pages.length,
    seoOutputs,
    outputDir
  };
  const manifest = createBuildManifest(sitePlan, buildResult, options);

  await mkdir(path.dirname(buildResult.manifestPath), { recursive: true });
  await writeFile(buildResult.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return buildResult;
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
