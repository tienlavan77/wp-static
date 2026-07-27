# Architecture v2 Migration - Commit H Diff Summary

## Commit

Commit H - Site Path Isolation Policy

## Scope

Add a reusable path policy for preventing cross-site filesystem access.

## Files Added

- `src/site/createSitePathPolicy.js`
- `test/sitePathPolicy.test.js`
- `outputs/architecture-v2/commit-h-site-path-policy.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `createSitePathPolicy()`.
- Added `resolve()` for paths under one site root.
- Added `assertAllowed()` and `isAllowed()`.
- Added tests proving paths from another site are rejected.

## Architecture Notes

This supports Architecture v2 Principle 2 and Principle 6:

- Site Isolation
- Zero Cross-Site Coupling

Future setup, build, webhook, and deploy services should use this policy before reading or writing site-local files.

## Verification

```bash
node --check src/site/createSitePathPolicy.js
node --test test/sitePathPolicy.test.js test/siteRepository.test.js
```

## Audit Result

Ready for review.
