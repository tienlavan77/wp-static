import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import copyPublicAssets from "./copyPublicAssets.js";
import createBuildManifest from "./createBuildManifest.js";
import { BuildError } from "../shared/errors.js";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";

  try {
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    throw new BuildError(`Unable to prepare output directory "${outputDir}": ${error.message}`);
  }

  const copiedPublicAssets = await copyPublicAssets(options.publicDir, outputDir);

  for (const page of sitePlan.pages) {
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, page.html, "utf8");
  }

  const buildResult = {
    copiedPublicAssets,
    manifestPath: path.join(outputDir, ".wpsc", "manifest.json"),
    pagesWritten: sitePlan.pages.length,
    outputDir
  };
  const manifest = createBuildManifest(sitePlan, buildResult, options);

  await mkdir(path.dirname(buildResult.manifestPath), { recursive: true });
  await writeFile(buildResult.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return buildResult;
}
