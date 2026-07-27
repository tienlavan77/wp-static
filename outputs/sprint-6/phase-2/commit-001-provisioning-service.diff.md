# Sprint 6 - Phase 2 Commit 001 Diff Summary

## Commit

feat(provision): create provisioning service

## Scope

Create the shared Provisioning Service foundation used by future Browser Setup and CLI Setup.

## Files Added

- `src/provision/createProvisioningService.js`
- `test/provisioningService.test.js`
- `outputs/sprint-6/phase-2/commit-001-provisioning-service.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `createProvisioningService()`.
- Added `SITE_PROVISIONING_DIRECTORIES`.
- Added site skeleton creation under `sites/<site>/`.
- Added metadata generation with UUID v4 and `SETUP_REQUIRED` state.
- Added metadata schema validation before write.
- Added tests proving the generated site can be loaded by Site Loader.

## Architecture Notes

This is the first commit of Sprint 6 Phase 2.

The service is shared infrastructure and is not tied to Browser Wizard or CLI.

This commit does not implement:

- Secret Generator
- Config Generator
- Source Registration
- First Build
- Webhook Gateway

Those remain later Phase 2-6 commits.

## Verification

```bash
node --check src/provision/createProvisioningService.js
node --test test/provisioningService.test.js test/siteMetadata.test.js test/siteLoader.test.js test/siteRegistry.test.js
```

## Audit Result

Ready for review.

## Test Result

```text
tests 19
pass 19
fail 0
```

## Diff Stat

```text
 .../commit-001-provisioning-service.diff.md        |  55 +++++++++++
 src/index.js                                       |   5 +
 src/provision/createProvisioningService.js         | 110 +++++++++++++++++++++
 test/provisioningService.test.js                   |  74 ++++++++++++++
 4 files changed, 244 insertions(+)
```
