# Sprint 6 - Phase 1 Foundation Refactor

## Status

Ready for review.

## Purpose

Stabilize Site Foundation before starting Phase 2 - Shared Provisioning Service.

## Changes

### SiteState Enum

`SiteState` remains the single exported enum for site lifecycle state values.

### Metadata Schema Validation

Added:

- `SITE_METADATA_REQUIRED_FIELDS`
- `validateSiteMetadata()`

Validation checks:

- required metadata fields
- UUID v4
- known SiteState value

### Registry Path Handling

Added:

- `createSiteRelativePath(siteId)`

Registry entries continue to expose portable relative paths, not absolute local machine paths.

### Tests

Added metadata validation coverage and registry path helper coverage.

## Verification

```bash
node --check src/site/createSiteMetadata.js
node --check src/site/createSiteRegistry.js
node --test test/siteMetadata.test.js test/siteStateManager.test.js test/siteRepository.test.js test/sitePathPolicy.test.js test/siteUuid.test.js test/siteLoader.test.js test/siteRegistry.test.js
```

## Audit Checklist

- [x] `SiteState` enum exists.
- [x] Metadata schema has required field validation.
- [x] UUID validation requires UUID v4.
- [x] Registry path handling is relative.
- [x] Tests cover metadata validation.

## Test Result

```text
tests 17
pass 17
fail 0
```

## Diff Stat

```text
 src/index.js                   |  9 ++++++--
 src/site/createSiteMetadata.js | 52 ++++++++++++++++++++++++++++++++++++++++++
 src/site/createSiteRegistry.js |  6 ++++-
 test/siteMetadata.test.js      | 34 ++++++++++++++++++++++++++-
 test/siteRegistry.test.js      |  5 +++-
 5 files changed, 101 insertions(+), 5 deletions(-)
```
