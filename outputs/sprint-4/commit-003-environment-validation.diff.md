# Sprint 4 / Commit 003 - Environment Validation

## Summary

Added installation environment validation for browser-based setup.

## Files Changed

- `src/installer/validateInstallationEnvironment.js`
- `test/installationEnvironment.test.js`
- `docs/sprint-4-installation-experience.md`
- `outputs/sprint-4/README.md`
- `outputs/sprint-4/commit-003-environment-validation.diff.md`
- `outputs/sprint-4/reviews/commit-003-review.md`

## Architecture Notes

- Environment Validation belongs to the installer layer.
- It reuses existing environment validation helpers.
- It returns structured diagnostics suitable for Wizard API/UI.
- It does not generate files, run builds, or call WordPress APIs.

## Checks

- Node.js compatibility
- PHP availability
- writable output directory
- SSL/domain readiness
- Runtime Configuration compatibility

## Verification

```bash
node --test test/installationEnvironment.test.js
node --check src/installer/validateInstallationEnvironment.js
```
