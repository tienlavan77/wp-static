# Sprint 6 - Phase 3 Commit 014 Diff Summary

## Commit

browser: implement Setup Wizard

## Scope

Implement the Browser Setup Wizard as an HTML/CSS/JavaScript REST client. The
browser renders server-provided setup presentation and diagnostics; it does not
own setup workflow logic.

## Files Added

- `src/browser/createSetupWizard.js`
- `test/setupWizard.test.js`
- `outputs/sprint-6/phase-3/commit-014-browser-setup-wizard.diff.md`

## Files Changed

- `src/api/createSetupApi.js`
- `src/index.js`
- `src/setup/createSetupService.js`
- `src/setup/createSetupStateMachine.js`
- `test/setupApi.test.js`

## What Changed

- Added a generated Browser Wizard shell with site form, progress, refresh,
  advance action, and diagnostic display.
- Added a State Machine-owned presentation contract: title, progress,
  `canAdvance`, and revision.
- Browser stores only `sessionId`, current state snapshot, and revision.
- Browser starts or advances through REST actions and always GETs session state
  before rendering the updated snapshot.
- Browser diagnostics preserve the `code`, `message`, and `severity` fields
  returned by Setup API without structural translation.
- Browser source contains no workflow state enums, transition table, or
  client-supplied next-state input.

## Architecture Audit

- Presentation state is produced above the Browser layer, by State Machine and
  Setup Service.
- REST continues to act as a gateway; it returns presentation metadata but
  does not render HTML.
- Browser does not cache an enum list and cannot decide what `READY` or
  `FAILED` means; it renders the current server snapshot.
- No source registration, first build, CLI logic, or dashboard functionality
  was added.

## Verification

```bash
node --check src/browser/createSetupWizard.js
node --check src/api/createSetupApi.js
node --check src/setup/createSetupService.js
node --test test/setupWizard.test.js test/setupApi.test.js test/setupService.test.js test/setupSessionManager.test.js test/setupStateMachine.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 17
pass 17
fail 0
```
