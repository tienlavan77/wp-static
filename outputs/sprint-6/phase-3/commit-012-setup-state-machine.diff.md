# Sprint 6 - Phase 3 Commit 012 Diff Summary

## Commit

setup: implement Setup State Machine

## Scope

Add the Setup State enum, transition validation, and workflow controller behind
the Shared Setup Service. This commit contains no REST API, Browser UI, CLI
command, source registration request, or persistence outside the session
repository contract.

## Files Added

- `src/setup/createSetupStateMachine.js`
- `test/setupStateMachine.test.js`
- `outputs/sprint-6/phase-3/commit-012-setup-state-machine.diff.md`

## Files Changed

- `src/setup/createSetupService.js`
- `src/setup/createSetupSessionManager.js`
- `src/setup/createSetupSessionRepository.js`
- `src/index.js`
- `test/setupService.test.js`
- `test/setupSessionManager.test.js`

## What Changed

- Added `SetupState`: `NOT_STARTED`, `VALIDATING`, `CONFIGURING`,
  `REGISTERING_SOURCE`, `READY`, and `FAILED`.
- Added legal transition validation and terminal `READY`/`FAILED` states.
- Setup Service owns one State Machine per runtime session and exposes the
  `transition()` business operation to future clients.
- Added the `setup.state.changed` event with previous/current state IDs and
  state-machine revision.
- Session snapshots store only `currentStateId`; transition rules and workflow
  logic remain outside Session Manager.
- Standardized default session IDs as framework-compatible UUID v4 values.
- Standardized the repository interface as `create/find/list/delete`; Map
  remains only the default implementation.
- Added `expiresAt: null` to the session contract without implementing session
  expiration behavior.

## Architecture Audit

- Browser and CLI cannot invoke State Machine methods through the root API;
  they call Setup Service.
- Setup Context contains no session or workflow state.
- Session Manager validates state ID presence but does not know valid states or
  transition rules.
- State changes replace immutable session snapshots instead of mutating them.
- Expiration, API transport, and UI state remain later-commit concerns.

## Verification

```bash
node --check src/setup/createSetupStateMachine.js
node --check src/setup/createSetupSessionManager.js
node --check src/setup/createSetupService.js
node --test test/setupService.test.js test/setupSessionManager.test.js test/setupStateMachine.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 14
pass 14
fail 0
```
