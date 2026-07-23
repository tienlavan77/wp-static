import assert from "node:assert/strict";
import test from "node:test";
import createBuildReport from "../src/report/createBuildReport.js";

test("createBuildReport renders build summary and pipeline details", () => {
  const report = createBuildReport({
    builtAt: "2026-07-23T00:00:00.000Z",
    config: {
      name: "Report Shop"
    },
    pipeline: {
      durationMs: 1234,
      stages: [
        {
          durationMs: 10,
          label: "Validate",
          name: "validate",
          ok: true
        },
        {
          durationMs: 250,
          label: "Compile",
          name: "compile",
          ok: true
        }
      ]
    },
    metrics: {
      assets: {
        total: 5,
        totalBytes: 4096
      },
      output: {
        pagesWritten: 1,
        totalPages: 4
      },
      performance: {
        memoryHeapUsedBytes: 2048,
        memoryRssBytes: 4096,
        totalDurationMs: 1234
      }
    },
    result: {
      adminApp: {
        outputPath: "admin.html"
      },
      assetStats: {
        cached: 2,
        downloaded: 3,
        total: 5
      },
      assetsDownloaded: 3,
      changedRoutes: ["/product-a"],
      contentStore: {
        filesWritten: 9
      },
      copiedPublicAssets: true,
      copiedThemeAssets: true,
      fragmentOutputs: {
        fragmentsWritten: 4
      },
      fullBuild: false,
      outputDir: "/tmp/dist",
      pagesWritten: 1,
      routeData: {
        routesWritten: 1
      },
      searchIndex: {
        itemsWritten: 7
      },
      totalPages: 4
    },
    sitePlan: {
      plugins: [
        {
          name: "sample-plugin"
        }
      ]
    },
    warnings: [
      {
        fix: "Check theme assets.",
        summary: "Theme assets missing"
      }
    ]
  });

  assert.match(report, /# WPSC Build Report/);
  assert.match(report, /Generated: 2026-07-23T00:00:00.000Z/);
  assert.match(report, /\| Name \| Report Shop \|/);
  assert.match(report, /\| Pages Written \| 1 \|/);
  assert.match(report, /\| Total Pages \| 4 \|/);
  assert.match(report, /\| Changed Routes \| \/product-a \|/);
  assert.match(report, /\| Asset Total \| 5 \|/);
  assert.match(report, /## Performance Metrics/);
  assert.match(report, /\| Total Duration \| 1.23s \|/);
  assert.match(report, /\| Asset Bytes \| 4.0 KB \|/);
  assert.match(report, /\| Memory RSS \| 4.0 KB \|/);
  assert.match(report, /\| Validate \| OK \| 10ms \|/);
  assert.match(report, /Total Duration: 1.23s/);
  assert.match(report, /sample-plugin/);
  assert.match(report, /Theme assets missing/);
  assert.match(report, /No errors/);
});

test("createBuildReport handles empty build details", () => {
  const report = createBuildReport();

  assert.match(report, /\| Name \| Unknown \|/);
  assert.match(report, /No plugins/);
  assert.match(report, /No performance metrics/);
  assert.match(report, /No pipeline data/);
  assert.match(report, /No warnings/);
  assert.match(report, /No errors/);
});
