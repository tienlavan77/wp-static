# Sprint 6 - Phase 3 Commit 010 Diff Summary

## Commit

setup: introduce shared Setup Service

## Scope

Introduce the shared Setup Service foundation, its immutable context contract,
and a UI-neutral event boundary. This commit deliberately contains no session
persistence, workflow state machine, REST API, Browser Wizard, or CLI command.

## Files Added

- `src/setup/createSetupService.js`
- `test/setupService.test.js`
- `outputs/sprint-6/phase-3/commit-010-shared-setup-service.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `createSetupService()` as the only Phase 3 business-logic entry point.
- Added `SetupClient` contract for Browser, CLI, and Dashboard consumers.
- Added immutable `SetupContext` creation and validation.
- Added `setup.context.created` and `setup.context.rejected` events.
- Added structured diagnostics for invalid clients and missing site identifiers.

## Architecture Notes

The service does not call the Provisioning Engine yet. Later commits add
sessions, workflow transitions, and client gateways through this service only.
Browser, CLI, REST, and Dashboard are consumers; none may recreate setup
context validation or business logic locally.

## Verification

```bash
node --check src/setup/createSetupService.js
node --test test/setupService.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 6
pass 6
fail 0
```
