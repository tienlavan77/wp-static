# Sprint 1 / Commit 002 - Validation Foundation

## Goal

Add the shared validation result model and environment checks that will power
Install Wizard, `wpsc doctor`, and `wpsc validate`.

## Files Changed

```text
src/validation/createValidationResult.js
src/validation/checkEnvironment.js
src/core/doctorProject.js
test/validationEnvironment.test.js
test/doctorProject.test.js
outputs/sprint-1/commit-002-validation-foundation.diff.md
outputs/sprint-1/reviews/commit-002-review.md
```

## Summary

This commit adds:

- `ok`, `warning`, and `error` validation statuses.
- Legacy-compatible `ok` boolean for existing checks.
- Human-readable `summary`.
- Optional actionable `fix`.
- Node.js version check.
- PHP version check.
- Readable path check.
- Writable output directory check.
- Doctor project integration with the new model.

## Architecture Impact

No Sprint 0 boundary changes.

The new `src/validation/` folder supports Sprint 1 product diagnostics. It does
not change Adapter, Compiler, Runtime, Theme, Plugin, or Build Engine
contracts.

## Verification

Run:

```text
node --test test/validationEnvironment.test.js test/doctorProject.test.js
```

## Follow-Up Items

Commit 003 should upgrade CLI `wpsc doctor` output to show:

- OK
- Warning
- Error
- explanation
- fix guidance

