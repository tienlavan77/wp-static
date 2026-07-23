import { readFile, writeFile } from "node:fs/promises";
import buildProjectOnce from "./buildProjectOnce.js";
import createBuildMetrics from "../report/createBuildMetrics.js";

export default async function buildProductionProjectOnce(projectArg, options = {}) {
  const build = await buildProjectOnce(projectArg, {
    ...options,
    production: true
  });
  const production = createProductionMetadata(build);

  build.result.production = production;
  build.result.productionBuild = true;

  await updateManifest(build.result.manifestPath, {
    production
  });

  return build;
}

function createProductionMetadata(build) {
  const metrics = createBuildMetrics(build);

  return {
    enabled: true,
    generatedAt: new Date().toISOString(),
    metrics,
    mode: "production",
    optimizations: {
      assetStats: build.result.assetStats ?? null,
      cache: {
        routeRenderCacheHits: build.sitePlan.cache?.routeRenderCacheHits ?? 0,
        routeRenderCacheMisses: build.sitePlan.cache?.routeRenderCacheMisses ?? 0
      },
      staticOutput: true
    }
  };
}

async function updateManifest(manifestPath, patch) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const updatedManifest = {
    ...manifest,
    production: patch.production
  };

  await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`, "utf8");
}
