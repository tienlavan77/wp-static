# Sprint 4 / Commit 001 - Installation Session

## Summary

Added the Installation Session primitive for Sprint 4.

## Files Changed

- `src/installer/createInstallationSession.js`
- `test/installationSession.test.js`
- `docs/sprint-4-installation-experience.md`
- `outputs/sprint-4/README.md`
- `outputs/sprint-4/commit-001-installation-session.diff.md`
- `outputs/sprint-4/reviews/commit-001-review.md`

## Architecture Notes

- Installation Session belongs to the installer layer.
- It does not own filesystem writes.
- It does not perform environment checks.
- It does not call the build engine.
- It does not expose browser UI.
- It prepares state/progress for Commit 002 Wizard API.

## Lifecycle

```text
START
-> CHECK
-> CONFIGURE
-> VALIDATE
-> BUILD
-> FINISH
```

## Verification

```bash
node --test test/installationSession.test.js
node --check src/installer/createInstallationSession.js
```
