# Architecture v2 Migration - Commit E Diff Summary

## Commit

Commit E - Site Lifecycle State Manager

## Scope

Add lifecycle transition rules for Architecture v2 site states.

## Files Added

- `src/site/createSiteStateManager.js`
- `test/siteStateManager.test.js`
- `outputs/architecture-v2/commit-e-site-state-manager.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `SITE_STATE_TRANSITIONS`.
- Added `createSiteStateManager()`.
- Added safe transition checks.
- Added transition metadata fields:
  - `previous_status`
  - `status_reason`
  - `updated_at`
- Added tests for valid and invalid transitions.

## Architecture Notes

This commit keeps lifecycle logic independent from filesystem writes.

It does not:

- read `sites/<site>/config/site.json`
- write metadata files
- run setup
- trigger build
- process webhook

Persistence should be introduced through a site repository/service later.

## Verification

```bash
node --check src/site/createSiteStateManager.js
node --test test/siteMetadata.test.js test/siteStateManager.test.js
```

## Audit Result

Ready for review.
