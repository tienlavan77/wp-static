# Sprint 5 - Commit 005 Diff Summary

## Commit

005 - Installation Lock

## Files Changed

- `src/release/createInstallationLock.js`
- `src/release/createHttpInstaller.js`
- `test/installationLock.test.js`
- `test/httpInstaller.test.js`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/reviews/commit-005-review.md`

## Summary

Commit 005 adds the production installation lock primitive and wires a lock guard into the HTTP installer.

## Behavior

- Creates `config/install.lock` with atomic JSON writes.
- Reads unlocked, locked, and corrupt lock states.
- Blocks repeated installation with `install.lock.exists`.
- Treats corrupt lock files as installed with `install.lock.corrupt`.
- Redirects `GET /install` to `/install/already-installed` when locked.
- Returns structured `409` responses for locked installer API calls.

## Out of Scope

- Unlock/recovery workflow.
- Release zip creation.
- Deployment guide.
- Automatic lock creation from the production build endpoint.

## Verification

```bash
node --check src/release/createInstallationLock.js
node --check src/release/createHttpInstaller.js
node --test test/installationLock.test.js test/httpInstaller.test.js
```
