# Sprint 2 / Commit 002 - Build Report

## Intent

Add the Build Report formatter that turns build results, pipeline data, warnings, errors, assets, runtime output, and plugin information into a support-friendly Markdown report.

## Files Added

| File | Purpose |
| --- | --- |
| `src/report/createBuildReport.js` | Creates `build-report.md` content from build details. |
| `test/buildReport.test.js` | Verifies summary, assets, plugins, pipeline, warning/error, and empty-state output. |
| `outputs/sprint-2/commit-002-build-report.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-002-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `outputs/sprint-2/README.md` | Marks Commit 002 as done. |

## Report Sections

- Project
- Build Summary
- Assets
- Runtime
- Plugins
- Pipeline
- Warnings
- Errors

## Architecture Notes

- No public contracts changed.
- No compiler, adapter, theme, runtime, or plugin API changes.
- Report generation is isolated under the existing report area.
- Build flow integration is intentionally left for a later commit because build files currently contain unrelated dirty work.

## Verification

```bash
node --test test/buildReport.test.js test/buildPipelineFoundation.test.js
node --check src/report/createBuildReport.js
```

Result:

```text
Build report tests passed.
Build pipeline foundation tests passed.
Syntax checks passed.
```

## Follow-up

- Wire report writing into the build flow after separating dirty build-file changes.
- Add `build-report.json` later if CI/dashboard automation needs it.
