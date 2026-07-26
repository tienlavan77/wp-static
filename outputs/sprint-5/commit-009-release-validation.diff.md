# Sprint 5 - Commit 009 Diff Summary

## Commit

009 - Release Validation

## Files Changed

- `src/release/validateReleasePackage.js`
- `src/cli/index.js`
- `test/releaseValidation.test.js`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/reviews/commit-009-review.md`

## Summary

Commit 009 adds validation for generated release packages and exposes it through the CLI.

## Behavior

- Validates required release directories.
- Validates required bootstrap files.
- Reads and validates `release-manifest.json`.
- Checks writable runtime directories.
- Reports installation lock state.
- Adds `wpsc release validate --release-dir <dir>`.

## Out of Scope

- Automatic fixes.
- Deployment execution.
- Browser validation UI.
- Final Sprint 5 documentation review.

## Verification

```bash
node --check src/release/validateReleasePackage.js
node --check src/cli/index.js
node --test test/releaseValidation.test.js
```
