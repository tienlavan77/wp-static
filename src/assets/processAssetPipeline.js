import path from "node:path";
import collectAssetUrls from "./collectAssetUrls.js";
import createAssetFilename from "./createAssetFilename.js";
import downloadAsset from "./downloadAsset.js";
import rewriteAssetUrls from "./rewriteAssetUrls.js";

export default async function processAssetPipeline(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const assetOutputDir = path.join(outputDir, "assets", "media");
  const cacheDir = options.cacheDir ?? path.join(outputDir, ".wpsc", "cache", "assets");
  const urls = collectAssetUrls(sitePlan);
  const entries = [];
  const assetMap = new Map();

  for (const url of urls) {
    const filename = createAssetFilename(url);
    const publicPath = `/assets/media/${filename}`;
    const result = await downloadAsset(url, {
      cacheDir,
      filename,
      outputDir: assetOutputDir
    });

    assetMap.set(url, publicPath);
    entries.push({
      sourceUrl: url,
      outputPath: `assets/media/${filename}`,
      publicPath,
      bytes: result.bytes,
      cached: result.cached
    });
  }

  return {
    entries,
    map: Object.fromEntries(assetMap),
    rewriteHtml(html) {
      return rewriteAssetUrls(html, assetMap);
    }
  };
}
