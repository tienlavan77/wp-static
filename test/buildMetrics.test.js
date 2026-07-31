import assert from "node:assert/strict";
import test from "node:test";
import createBuildMetrics from "../framework/src/builder/report/createBuildMetrics.js";

test("createBuildMetrics summarizes output assets pipeline and memory", () => {
  const metrics = createBuildMetrics({
    memoryUsage: {
      heapUsed: 2048,
      rss: 4096
    },
    pipeline: {
      durationMs: 1234,
      stages: [
        {
          durationMs: 10,
          name: "validate",
          ok: true
        }
      ]
    },
    result: {
      assetStats: {
        cached: 1,
        downloaded: 2,
        total: 3,
        totalBytes: 4096
      },
      fragmentOutputs: {
        fragmentsWritten: 4
      },
      pagesWritten: 2,
      routeData: {
        routesWritten: 2
      },
      totalPages: 5
    }
  });

  assert.deepEqual(metrics.assets, {
    cached: 1,
    downloaded: 2,
    total: 3,
    totalBytes: 4096
  });
  assert.deepEqual(metrics.output, {
    fragmentsWritten: 4,
    pagesWritten: 2,
    routeDataWritten: 2,
    totalPages: 5
  });
  assert.equal(metrics.performance.totalDurationMs, 1234);
  assert.equal(metrics.performance.memoryRssBytes, 4096);
  assert.equal(metrics.pipeline.stages[0].name, "validate");
});
