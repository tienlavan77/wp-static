# Sprint 4 / Commit 006 - Installation Report

## Summary

Added Markdown installation report generation.

## Files Changed

- `src/installer/createInstallationReport.js`
- `test/installationReport.test.js`
- `docs/sprint-4-installation-experience.md`
- `outputs/sprint-4/README.md`
- `outputs/sprint-4/commit-006-installation-report.diff.md`
- `outputs/sprint-4/reviews/commit-006-review.md`

## Architecture Notes

- Installation Report belongs to the installer layer.
- It is read-only and does not write files.
- It summarizes environment, configuration, runtime, build, and diagnostics.
- It prepares support/debug output for Wizard API or future UI download.

## Verification

```bash
node --test test/installationReport.test.js test/installationConfigGenerator.test.js test/installationSession.test.js
node --check src/installer/createInstallationReport.js
```
