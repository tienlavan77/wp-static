import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function buildSite(sitePlan, options = {}) {
  const outputDir = options.outputDir ?? "dist";

  await mkdir(outputDir, { recursive: true });

  for (const page of sitePlan.pages) {
    const filePath = path.join(outputDir, page.route.outputPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, page.html, "utf8");
  }

  return {
    pagesWritten: sitePlan.pages.length,
    outputDir
  };
}
