# Sprint 6 - Phase 2 Commit 002 Diff Summary

## Commit

feat(provision): add provisioning events

## Scope

Add event-driven foundation to Provisioning Service.

## Files Changed

- `src/provision/createProvisioningService.js`
- `src/index.js`
- `test/provisioningService.test.js`
- `outputs/sprint-6/phase-2/commit-002-provisioning-events.diff.md`

## What Changed

- Added `ProvisioningEvent` enum.
- Added event recorder inside `createProvisioningService()`.
- Added optional `onEvent` callback.
- Returned `events` in success and failure results.
- Emitted lifecycle events:
  - `provision.started`
  - `provision.directory.created`
  - `provision.metadata.generated`
  - `provision.metadata.validated`
  - `provision.metadata.written`
  - `provision.completed`
  - `provision.failed`

## Architecture Notes

Provisioning remains UI-agnostic.

Browser Wizard, CLI, reports, and logs can consume events without duplicating provisioning logic.

This commit does not implement transaction rollback yet.

## Verification

```bash
node --check src/provision/createProvisioningService.js
node --test test/provisioningService.test.js
```

## Audit Result

Ready for review.

## Test Result

```text
tests 9
pass 9
fail 0
```

## Diff Stat

```text
 src/index.js                               |  1 +
 src/provision/createProvisioningService.js | 68 ++++++++++++++++++++++++++++++
 test/provisioningService.test.js           | 19 +++++++++
 3 files changed, 88 insertions(+)
```
