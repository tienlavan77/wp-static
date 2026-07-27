# Architecture v2 Migration - Commit D Diff Summary

## Commit

Commit D - Site Metadata Foundation

## Scope

Add the first Architecture v2 site metadata primitive and create the initial `tinsinhphat` site runtime structure.

## Files Added

- `src/site/createSiteMetadata.js`
- `test/siteMetadata.test.js`
- `sites/tinsinhphat/config/site.json`
- `sites/tinsinhphat/storage/cache/.gitkeep`
- `sites/tinsinhphat/storage/logs/.gitkeep`
- `sites/tinsinhphat/storage/tmp/.gitkeep`
- `sites/tinsinhphat/storage/sessions/.gitkeep`
- `sites/tinsinhphat/public/dist/.gitkeep`
- `sites/tinsinhphat/themes/.gitkeep`
- `sites/tinsinhphat/plugins/.gitkeep`
- `outputs/architecture-v2/commit-d-site-metadata.diff.md`

## Files Changed

- `src/index.js`

## What Changed

- Added `createSiteMetadata()`.
- Added `SITE_STATUSES`.
- Exported the metadata primitive from the public package entry.
- Created the first isolated site folder for `tinsinhphat`.
- Added the Architecture v2 build output target at `sites/tinsinhphat/public/dist`.

## Architecture Notes

This commit creates metadata only.

It does not:

- move legacy example code
- run setup
- connect WordPress
- build site output
- implement lifecycle transitions

Lifecycle transition rules belong to the next commit.

## Verification

```bash
node --check src/site/createSiteMetadata.js
node --test test/siteMetadata.test.js
```

## Audit Result

Ready for review.
