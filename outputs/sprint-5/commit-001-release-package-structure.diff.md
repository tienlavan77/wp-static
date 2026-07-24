# Sprint 5 / Commit 001 - Release Package Structure

## Summary

Added the production release package structure definition.

## Files Changed

- `src/release/createReleasePackageStructure.js`
- `test/releasePackageStructure.test.js`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/commit-001-release-package-structure.diff.md`
- `outputs/sprint-5/reviews/commit-001-review.md`

## Architecture Notes

- Release Package Structure belongs to the release layer.
- It defines a stable package layout without creating zip files.
- It documents immutable release package rules.
- It distinguishes VPS and shared-hosting modes.
- It does not expose HTTP routes, write persistent config, or execute builds.

## Verification

```bash
node --test test/releasePackageStructure.test.js
node --check src/release/createReleasePackageStructure.js
```
