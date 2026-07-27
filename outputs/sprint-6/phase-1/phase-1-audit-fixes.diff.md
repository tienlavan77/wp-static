# Sprint 6 - Phase 1 Audit Fixes

## Status

Ready for review.

## Audit Items Addressed

### 1. Site Metadata Contract

Verified and locked the required metadata fields:

```json
{
  "uuid": "",
  "name": "",
  "status": "",
  "framework_version": "",
  "created_at": "",
  "updated_at": ""
}
```

The implementation also keeps `metadata_version` for internal schema tracking.

### 2. UUID v4

`createSiteUuid()` now validates UUID v4 only.

Rejected:

- timestamp strings
- random non-UUID strings
- UUID versions other than v4

### 3. Registry Relative Path

`createSiteRegistry().listSites()` now returns portable registry entries:

```js
{
  id,
  name,
  relativePath,
  metadata
}
```

It does not store or return absolute workspace paths in registry entries.

Use `registry.loadSite(siteId)` only when runtime needs absolute paths.

### 4. Loader Validation

`createSiteLoader()` validates required directories:

- `config`
- `storage`
- `public`
- `themes`
- `plugins`

If missing, it throws.

It does not auto-create folders. Folder creation belongs to Provisioning.

### 5. Site State Enum

Added `SiteState` enum and wired state transitions through it.

This avoids hardcoding state strings across site management code.

## Verification

```bash
node --check src/site/createSiteMetadata.js
node --check src/site/createSiteUuid.js
node --check src/site/createSiteLoader.js
node --check src/site/createSiteRegistry.js
node --test test/siteMetadata.test.js test/siteStateManager.test.js test/siteRepository.test.js test/sitePathPolicy.test.js test/siteUuid.test.js test/siteLoader.test.js test/siteRegistry.test.js
```

## Test Result

```text
tests 16
pass 16
fail 0
```

## Diff Stat

```text
 src/index.js                       |  1 +
 src/site/createSiteLoader.js       | 40 ++++++++++++++++++++++++++++---------
 src/site/createSiteMetadata.js     | 40 +++++++++++++++++--------------------
 src/site/createSiteRegistry.js     | 14 ++++++++++++-
 src/site/createSiteStateManager.js | 18 ++++++++---------
 src/site/createSiteUuid.js         |  2 +-
 test/siteLoader.test.js            | 41 +++++++++++++++++++++++++++++++++++++-
 test/siteMetadata.test.js          | 30 ++++++++++++++++++----------
 test/siteRegistry.test.js          | 14 ++++++++++++-
 test/siteUuid.test.js              |  6 ++++++
 10 files changed, 152 insertions(+), 54 deletions(-)
```
