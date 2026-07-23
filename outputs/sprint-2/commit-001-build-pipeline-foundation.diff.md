# Sprint 2 / Commit 001 - Build Pipeline Foundation

## Intent

Create a reusable internal build pipeline runner that standardizes the Sprint 2 workflow:

```text
Validate -> Compile -> Optimize -> Output
```

## Files Added

| File | Purpose |
| --- | --- |
| `docs/sprint-2-developer-workflow.md` | Captures Sprint 2 goals, scope, constraints, and commit plan. |
| `outputs/sprint-2/README.md` | Sprint 2 tracking index. |
| `src/builder/createBuildPipeline.js` | Internal build pipeline runner and standard stage factory. |
| `test/buildPipelineFoundation.test.js` | Tests stage order, progress events, context outputs, and failure annotation. |
| `outputs/sprint-2/commit-001-build-pipeline-foundation.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-001-review.md` | Commit-level review record. |

## Architecture Notes

- Does not change public contracts.
- Does not change Compiler, Adapter, Theme, Runtime, or Plugin APIs.
- Adds an internal helper under the existing Build Engine area.
- Keeps integration with existing build flow for later commits.

## Verification

```bash
node --test test/buildPipelineFoundation.test.js
node --check src/builder/createBuildPipeline.js
```

Result:

```text
Build pipeline foundation tests passed.
Syntax checks passed.
```

## Follow-up

- Commit 002 can use pipeline timing data for `build-report.md`.
- Later commits can wire the helper into `buildProjectOnce` once dirty build files are separated cleanly.
