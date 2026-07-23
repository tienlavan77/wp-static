# Sprint 4 / Commit 002 - Wizard API

## Summary

Added the Wizard API primitive for browser-facing installation actions.

## Files Changed

- `src/installer/createWizardApi.js`
- `test/wizardApi.test.js`
- `docs/sprint-4-installation-experience.md`
- `outputs/sprint-4/README.md`
- `outputs/sprint-4/commit-002-wizard-api.diff.md`
- `outputs/sprint-4/reviews/commit-002-review.md`

## Architecture Notes

- Wizard API is the only browser-facing contract introduced in this commit.
- It wraps Installation Session state/actions.
- It returns structured responses.
- It does not expose Runtime primitives to the browser.
- It does not implement HTTP transport or UI.

## API Capabilities

- create session
- read state
- update input
- transition lifecycle
- add warning
- fail session
- finish session
- list session snapshots

## Verification

```bash
node --test test/wizardApi.test.js test/installationSession.test.js
node --check src/installer/createWizardApi.js
```
