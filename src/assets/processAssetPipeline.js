import path from "node:path";
import collectAssetUrls from "./collectAssetUrls.js";
import createAssetFilename from "./createAssetFilename.js";
import downloadAsset from "./downloadAsset.js";
import rewriteAssetUrls from "./rewriteAssetUrls.js";
import runLimitedParallel from "../performance/runLimitedParallel.js";

export default async function processAssetPipeline(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const assetOutputDir = path.join(outputDir, "assets", "media");
  const cacheDir = options.cacheDir ?? path.join(outputDir, ".wpsc", "cache", "assets");
  const urls = collectAssetUrls(sitePlan);
  const assetMap = new Map();

  const entries = await runLimitedParallel(urls, async (url) => {
    const filename = createAssetFilename(url);
    const publicPath = `/assets/media/${filename}`;
    const result = await downloadAsset(url, {
      cacheDir,
      filename,
      outputDir: assetOutputDir
    });

    assetMap.set(url, publicPath);
    return {
      sourceUrl: url,
      outputPath: `assets/media/${filename}`,
      publicPath,
      bytes: result.bytes,
      cached: result.cached
    };
  }, {
    concurrency: options.assetConcurrency
  });

  return {
    entries,
    stats: {
      cached: entries.filter((entry) => entry.cached).length,
      downloaded: entries.filter((entry) => !entry.cached).length,
      total: entries.length
    },
    map: Object.fromEntries(assetMap),
    rewriteHtml(html) {
      return rewriteAssetUrls(html, assetMap);
    }
  };
}
