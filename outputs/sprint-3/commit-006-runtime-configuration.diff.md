# Sprint 3 / Commit 006 - Runtime Configuration

## Summary

Added Runtime Configuration normalization and validation.

## Files Changed

- `src/runtime/createRuntimeConfig.js`
- `test/runtimeConfig.test.js`
- `outputs/sprint-3/README.md`
- `outputs/sprint-3/commit-006-runtime-configuration.diff.md`
- `outputs/sprint-3/reviews/commit-006-review.md`

## Architecture Notes

- Runtime Configuration belongs to Runtime Kernel.
- It validates runtime-facing config objects before execution.
- It does not read files from disk.
- It does not load extensions directly.
- Extension Loader remains responsible for extension execution.

## Configuration Capabilities

- mode normalization
- project/output/cache path normalization
- services shape validation
- extension descriptor normalization
- duplicate extension detection
- structured diagnostics with error codes

## Verification

```bash
node --test test/runtimeConfig.test.js
node --check src/runtime/createRuntimeConfig.js
```
