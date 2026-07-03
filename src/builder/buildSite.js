import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import copyPublicAssets from "./copyPublicAssets.js";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const copiedPublicAssets = await copyPublicAssets(options.publicDir, outputDir);

  for (const page of sitePlan.pages) {
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, page.html, "utf8");
  }

  return {
    copiedPublicAssets,
    pagesWritten: sitePlan.pages.length,
    outputDir
  };
}
