# Sprint 2 / Commit 006 - Production Build

## Intent

Add a production build mode that clearly marks build output and manifests as production-ready static output without changing core compiler/runtime contracts.

## Files Added

| File | Purpose |
| --- | --- |
| `src/dev-server/buildProductionProjectOnce.js` | Wraps the existing build flow and marks result/manifest with production metadata. |
| `test/productionBuild.test.js` | Verifies production result, manifest metadata, and CLI output. |
| `outputs/sprint-2/commit-006-production-build.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-006-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/cli/index.js` | Adds `wpsc build --production` and prints build mode. |
| `outputs/sprint-2/README.md` | Marks Commit 006 as done. |

## CLI Added

```bash
wpsc build --project <project-dir> --production
```

## Production Metadata

The production build updates the manifest with:

```json
{
  "production": {
    "enabled": true,
    "mode": "production",
    "optimizations": {
      "staticOutput": true
    }
  }
}
```

## Architecture Notes

- No public contracts changed.
- No compiler, adapter, theme, runtime, or plugin API changes.
- Production build wraps the existing build flow.
- The implementation avoids mixing unrelated dirty build-flow changes.

## Verification

```bash
node --test test/productionBuild.test.js
node --check src/dev-server/buildProductionProjectOnce.js
node --check src/cli/index.js
node --check test/productionBuild.test.js
```

Result:

```text
2 production build tests passed.
Syntax checks passed.
```

## Follow-up

- Add minification/compression once optimization policy is finalized.
- Surface production metadata in Build Report.
- Add production validation profile later.
