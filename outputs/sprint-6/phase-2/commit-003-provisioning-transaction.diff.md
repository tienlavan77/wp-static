# Sprint 6 - Phase 2 Commit 003 Diff Summary

## Commit

feat(provision): add provisioning transaction plan

## Scope

Add transactional foundation to Provisioning Service.

## Files Changed

- `src/provision/createProvisioningService.js`
- `src/index.js`
- `test/provisioningService.test.js`
- `outputs/sprint-6/phase-2/commit-003-provisioning-transaction.diff.md`

## What Changed

- Added `ProvisioningStep` enum.
- Added `planCreateSite(siteId)`.
- Added transaction plan to create site results.
- Added rollback action tracking.
- Added rollback cleanup for site root if provisioning fails after directory creation.
- Added `provision.rolled_back` event.
- Added tests for plan stability and rollback behavior.

## Architecture Notes

Provisioning now has both foundations requested by audit:

- event-driven lifecycle
- transaction plan with rollback

This is still limited to site skeleton + metadata.

Secret generation, config generation, source registration, and first build remain later commits.

## Verification

```bash
node --check src/provision/createProvisioningService.js
node --test test/provisioningService.test.js
```

## Audit Result

Ready for review.

## Test Result

```text
tests 11
pass 11
fail 0
```

## Diff Stat

```text
 src/index.js                               |   4 +-
 src/provision/createProvisioningService.js | 193 ++++++++++++++++++++---------
 test/provisioningService.test.js           |  75 ++++++++++-
 3 files changed, 213 insertions(+), 59 deletions(-)
```
