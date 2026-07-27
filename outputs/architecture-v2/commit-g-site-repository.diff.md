# Architecture v2 Migration - Commit G Diff Summary

## Commit

Commit G - Site Repository

## Scope

Add a filesystem repository for reading and writing `sites/<site>/config/site.json` while enforcing site path isolation.

## Files Added

- `src/site/createSiteRepository.js`
- `test/siteRepository.test.js`
- `outputs/architecture-v2/commit-g-site-repository.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `createSiteRepository()`.
- Added safe site id validation.
- Added metadata path resolver.
- Added metadata read/write methods.
- Added tests for read/write and unsafe site ids.

## Architecture Notes

This commit implements Step 2 from the Architecture v2 migration map:

- read/write service for `sites/<site>/config/site.json`
- site path isolation
- no cross-site path traversal

It does not implement setup, source registration, build, or webhook behavior.

## Verification

```bash
node --check src/site/createSiteRepository.js
node --test test/siteMetadata.test.js test/siteStateManager.test.js test/siteRepository.test.js
```

## Audit Result

Ready for review.
