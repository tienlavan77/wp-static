import path from "node:path";
import collectAssetUrls from "./collectAssetUrls.js";
import createAssetFilename, { createWebpAssetFilename } from "./createAssetFilename.js";
import downloadAsset from "./downloadAsset.js";
import rewriteAssetUrls from "./rewriteAssetUrls.js";
import runLimitedParallel from "../../performance/runLimitedParallel.js";

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
      type: classifyAssetType(url),
      outputPath: `assets/media/${filename}`,
      publicPath,
      optimization: createImageOptimizationPlan(url),
      bytes: result.bytes,
      cached: result.cached
    };
  }, {
    concurrency: options.assetConcurrency
  });

  return {
    entries,
    stats: createAssetStats(entries),
    map: Object.fromEntries(assetMap),
    rewriteHtml(html) {
      return rewriteAssetUrls(html, assetMap);
    }
  };
}

function createAssetStats(entries) {
  return entries.reduce((stats, entry) => {
    const type = entry.type ?? "other";
    const optimizationStatus = entry.optimization?.status ?? "unknown";

    return {
      ...stats,
      byType: {
        ...stats.byType,
        [type]: (stats.byType[type] ?? 0) + 1
      },
      cached: stats.cached + (entry.cached ? 1 : 0),
      downloaded: stats.downloaded + (entry.cached ? 0 : 1),
      optimization: {
        ...stats.optimization,
        [optimizationStatus]: (stats.optimization[optimizationStatus] ?? 0) + 1
      },
      total: stats.total + 1,
      totalBytes: stats.totalBytes + (Number.isFinite(entry.bytes) ? entry.bytes : 0)
    };
  }, {
    byType: {
      css: 0,
      font: 0,
      image: 0,
      js: 0,
      other: 0
    },
    cached: 0,
    downloaded: 0,
    optimization: {
      planned: 0,
      skipped: 0,
      unknown: 0
    },
    total: 0,
    totalBytes: 0
  });
}

function classifyAssetType(url) {
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();

    if ([".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp"].includes(extension)) {
      return "image";
    }

    if (extension === ".css") {
      return "css";
    }

    if (extension === ".js" || extension === ".mjs") {
      return "js";
    }

    if ([".eot", ".otf", ".ttf", ".woff", ".woff2"].includes(extension)) {
      return "font";
    }
  } catch {
    return "other";
  }

  return "other";
}

function createImageOptimizationPlan(url) {
  const webpEligible = /\.(jpe?g|png|webp)(\?.*)?$/i.test(url);

  return {
    format: webpEligible ? "webp" : "passthrough",
    status: webpEligible ? "planned" : "skipped",
    webpOutputPath: webpEligible ? `assets/media/${createWebpAssetFilename(url)}` : null,
    note: webpEligible
      ? "WebP conversion is planned; current build keeps original bytes until an encoder is configured."
      : "Source format is not converted by the WebP pipeline."
  };
}
