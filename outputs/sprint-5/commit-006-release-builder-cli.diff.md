# Sprint 5 - Commit 006 Diff Summary

## Commit

006 - Release Builder CLI

## Files Changed

- `src/release/buildReleasePackage.js`
- `src/cli/index.js`
- `test/releaseBuilder.test.js`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/reviews/commit-006-review.md`

## Summary

Commit 006 adds a reusable release builder and exposes it through `wpsc release build`.

## Behavior

- Creates the standard release package directories and bootstrap files.
- Copies optional project `public/`, `themes/`, and `plugins/` directories.
- Generates `release-manifest.json`.
- Supports `--mode`, `--package-name`, `--output-dir`, `--clean`, and `--json`.

## Out of Scope

- Zip archive generation.
- Deployment documentation.
- Release validation.
- Installation recovery.

## Verification

```bash
node --check src/release/buildReleasePackage.js
node --check src/cli/index.js
node --test test/releaseBuilder.test.js
```
