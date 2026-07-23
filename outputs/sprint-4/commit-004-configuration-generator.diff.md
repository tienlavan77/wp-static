# Sprint 4 / Commit 004 - Configuration Generator

## Summary

Added installer configuration generation without filesystem writes.

## Files Changed

- `src/installer/createInstallationConfigGenerator.js`
- `test/installationConfigGenerator.test.js`
- `docs/sprint-4-installation-experience.md`
- `outputs/sprint-4/README.md`
- `outputs/sprint-4/commit-004-configuration-generator.diff.md`
- `outputs/sprint-4/reviews/commit-004-review.md`

## Architecture Notes

- Configuration Generator belongs to the installer layer.
- Runtime config normalization uses Sprint 3 `createRuntimeConfig`.
- The generator returns file candidates and does not write to disk.
- It does not perform build execution or WordPress API checks.

## Verification

```bash
node --test test/installationConfigGenerator.test.js test/runtimeConfig.test.js
node --check src/installer/createInstallationConfigGenerator.js
```
