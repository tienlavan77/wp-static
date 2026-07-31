# Sprint 7 Commit 004 - Shared Media Service

## Delivered

- WordPress media normalization now retains identifier, source URL, MIME type,
  dimensions, alt text, caption, title, source metadata and provider.
- WordPress `media_details.sizes` becomes sorted responsive metadata with URL,
  MIME type and dimensions for each available variant.
- Builder writes a stable Media Manifest at `.wpsc/media.json`.
- The manifest records source URLs and resolved static public URLs for the
  original media and each responsive variant.
- Runtime builds pass their `siteId` into the manifest, making the resulting
  artifact Site-scoped when copied to that Site's static output.
- Asset collection now includes declared responsive variants, reusing the
  existing Builder V1 download, cache and URL-rewrite pipeline.

## Contract

```text
WordPress Media
  -> WordPress media normalization
  -> Content Graph media
  -> Asset Pipeline
  -> .wpsc/media.json
  -> Static Site assets
```

`wpsc.media-manifest` version 1 is a build artifact. It contains no source
credentials and has no ownership of WordPress media authoring.

## Deliberate Boundary

This commit does not add a WPSC Media UI or local Media CRUD. WordPress remains
the Media authority. The existing Asset Pipeline already plans WebP output;
actual image transcoding requires a dedicated encoder/performance decision and
is deliberately outside this shared contract commit.

## Compatibility Repair

The C04 test run found a Layout Normalization regression in Builder Runtime
asset copying: `runtime/frontend` had moved to `runtime/browser/frontend`.
The path was corrected without changing Runtime or Builder behavior.

## Validation

```bash
node --test test/mediaService.test.js test/assetPipeline.test.js test/wordpressAdapter.test.js test/runtimeContentReader.test.js
node framework/src/cli/index.js --help
git diff --check
```

All checks pass (14 tests).
