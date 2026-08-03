# Sprint 10 Commit 018 - Targeted Content Refresh

Status: PASS

## Goal

Avoid a full WordPress/WooCommerce content fetch for an incremental webhook
when WPSC can prove that one independently fetchable Content record is enough.

## Delivered

- Added a Site-scoped, versioned Content Snapshot at
  `sites/<siteId>/storage/build/content-snapshot.json`.
- Content Snapshot and Dependency Manifest are both associated with the same
  published `buildId`; mismatch disables targeted refresh.
- Runtime Content Reader now accepts changed hints, dependency manifest, and
  prior Content Snapshot.
- For Product, Page, and Post updates, it asks an adapter for only the changed
  Content and replaces that record in the published Content Snapshot.
- Added targeted lookup support through WordPress and WooCommerce repository,
  adapter, combined adapter, and Runtime Source Adapter layers.
- The Builder still compiles a complete Site plan from the merged snapshot. C018
  reduces provider I/O; C017 controls which rendered route files are published.
- New snapshots are saved only after Output Pipeline successfully publishes.

## Full-Refresh Fallback

Runtime uses a full Source read if any condition cannot prove a complete,
consistent targeted update:

- No matching Dependency Manifest or Content Snapshot.
- Snapshot and manifest use different build IDs.
- Unsupported event type, including term, menu, media, and Site-wide changes.
- Provider returns no changed record or an identity that does not match the
  snapshot.
- The previous snapshot has no matching record. This safely covers deletion,
  rename, and incomplete webhook/provider responses until C020 owns their
  dedicated cleanup workflow.

## Security Boundary

The Content Snapshot stores normalized content and collections only. It must not
include WordPress Application Passwords, WooCommerce keys, webhook secrets, or
raw Source configuration.

## Validation

```bash
node --test test/contentSnapshotStore.test.js test/runtimeContentReader.test.js \
  test/buildIntegration.test.js test/wordpressAdapter.test.js \
  test/woocommerceAdapter.test.js test/wordpressWooCommerceAdapter.test.js \
  test/wordpressSourceAdapter.test.js test/incrementalBuild.test.js
git diff --check
```

Result: 48 tests passed, 0 failed.
