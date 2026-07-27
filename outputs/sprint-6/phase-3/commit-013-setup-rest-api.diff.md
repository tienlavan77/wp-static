# Sprint 6 - Phase 3 Commit 013 Diff Summary

## Commit

api: expose Setup REST API

## Scope

Expose a browser-facing, transport-neutral REST gateway over Shared Setup
Service. The API validates request shape and maps service results to response
contracts; it contains no workflow branches or state-transition rules.

## Files Added

- `src/api/createSetupApi.js`
- `test/setupApi.test.js`
- `outputs/sprint-6/phase-3/commit-013-setup-rest-api.diff.md`

## Files Changed

- `src/index.js`
- `src/setup/createSetupService.js`
- `src/setup/createSetupStateMachine.js`
- `test/setupService.test.js`

## What Changed

- Added routes for start, state lookup, service-owned advance, and end.
- The Browser API always identifies its client as `browser`; request input
  cannot select another SetupClient.
- API has no generic transition endpoint and ignores submitted state names.
- Added `advance()` to Setup Service; it asks State Machine for its next
  workflow state instead of accepting a UI-provided state enum.
- Every session response includes `currentStateId` and State Machine `revision`.
- Preserves the last state snapshot after session end so REST returns its final
  revision without allowing another transition.
- Removed `SetupState` from the root public API; Browser clients consume state
  values returned by Setup API only.

## Architecture Audit

- REST is a gateway: it calls `SetupService.start/getSession/advance/endSession`.
- REST has no `if (READY)` or equivalent workflow decision.
- State Machine remains the single owner of legal transitions and revision.
- Session preserves only a current state ID; state history remains deliberately
  deferred for a future audit capability.

## Verification

```bash
node --check src/api/createSetupApi.js
node --check src/setup/createSetupService.js
node --check src/setup/createSetupStateMachine.js
node --test test/setupApi.test.js test/setupService.test.js test/setupSessionManager.test.js test/setupStateMachine.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 16
pass 16
fail 0
```
