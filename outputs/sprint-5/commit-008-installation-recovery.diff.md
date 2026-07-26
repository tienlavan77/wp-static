# Sprint 5 - Commit 008 Diff Summary

## Commit

008 - Installation Recovery

## Files Changed

- `src/release/createInstallationLock.js`
- `src/cli/index.js`
- `test/installationLock.test.js`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/reviews/commit-008-review.md`

## Summary

Commit 008 adds a controlled installation recovery flow for release packages.

## Behavior

- Adds `installationLock.recover()`.
- Requires explicit confirmation before changing an existing lock.
- Archives `config/install.lock` to `config/install.lock.recovered.<timestamp>.json`.
- Leaves an audit trail instead of deleting the lock.
- Adds CLI command `wpsc release recover --release-dir <dir> --confirm`.
- Supports JSON output for support tooling.

## Out of Scope

- Browser recovery UI.
- Automatic recovery decisions.
- Release validation.
- Zip archive generation.

## Verification

```bash
node --check src/release/createInstallationLock.js
node --check src/cli/index.js
node --test test/installationLock.test.js
```
