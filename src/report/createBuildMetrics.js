export default function createBuildMetrics(details = {}) {
  const result = details.result ?? {};
  const sitePlan = details.sitePlan ?? {};
  const pipeline = details.pipeline ?? null;
  const memory = details.memoryUsage ?? process.memoryUsage?.() ?? {};

  return {
    assets: {
      cached: result.assetStats?.cached ?? 0,
      downloaded: result.assetStats?.downloaded ?? 0,
      total: result.assetStats?.total ?? 0,
      totalBytes: result.assetStats?.totalBytes ?? 0
    },
    output: {
      fragmentsWritten: result.fragmentOutputs?.fragmentsWritten ?? 0,
      pagesWritten: result.pagesWritten ?? 0,
      routeDataWritten: result.routeData?.routesWritten ?? 0,
      totalPages: result.totalPages ?? sitePlan.pages?.length ?? 0
    },
    performance: {
      memoryRssBytes: memory.rss ?? 0,
      memoryHeapUsedBytes: memory.heapUsed ?? 0,
      totalDurationMs: pipeline?.durationMs ?? result.durationMs ?? 0
    },
    pipeline: {
      stages: (pipeline?.stages ?? []).map((stage) => ({
        durationMs: stage.durationMs ?? 0,
        name: stage.name,
        ok: stage.ok !== false
      }))
    }
  };
}
