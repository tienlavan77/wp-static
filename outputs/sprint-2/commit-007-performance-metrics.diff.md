# Sprint 2 / Commit 007 - Performance Metrics

## Intent

Add build performance metrics that can feed reports, production metadata, and future diagnostics without changing public contracts.

## Files Added

| File | Purpose |
| --- | --- |
| `src/report/createBuildMetrics.js` | Summarizes output counts, asset counts/bytes, memory usage, and pipeline stage durations. |
| `test/buildMetrics.test.js` | Verifies metrics output. |
| `outputs/sprint-2/commit-007-performance-metrics.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-007-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/report/createBuildReport.js` | Adds Performance Metrics section. |
| `src/dev-server/buildProductionProjectOnce.js` | Adds metrics to production manifest metadata. |
| `test/buildReport.test.js` | Verifies metrics rendering. |
| `test/productionBuild.test.js` | Verifies production manifest metrics. |
| `outputs/sprint-2/README.md` | Marks Commit 007 as done. |

## Metrics Captured

- Pages written.
- Total pages.
- Route data written.
- Fragments written.
- Asset total/cached/downloaded.
- Asset bytes.
- Memory RSS.
- Memory heap used.
- Total duration.
- Pipeline stage durations.

## Architecture Notes

- No public contracts changed.
- Metrics live in the existing report/diagnostics area.
- Production build consumes metrics without changing compiler/runtime behavior.

## Verification

```bash
node --test test/buildMetrics.test.js test/buildReport.test.js test/productionBuild.test.js
node --check src/report/createBuildMetrics.js
node --check src/report/createBuildReport.js
node --check src/dev-server/buildProductionProjectOnce.js
```

Result:

```text
5 metrics/report/production tests passed.
Syntax checks passed.
```

## Follow-up

- Wire metrics into generated `build-report.md` once report writing is integrated into build flow.
- Add output directory size metrics later.
