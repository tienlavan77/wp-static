# Sprint 10 Commit 019 - Incremental Artifact Planner

Status: PASS

## Goal

Make every Build artifact's ownership and incremental scope explicit, so WPSC
can rebuild only route-local output where safe while deliberately refreshing
Site-wide derived products where correctness requires it.

## Delivered

- Added `createIncrementalArtifactPlan` under Builder Planner ownership.
- Every full and incremental Builder V1 build now exposes its artifact plan in
  `.wpsc/manifest.json` under `incremental.artifacts`.
- Route-scoped artifact sets are explicit: HTML, serve aliases, fragments,
  route data, and affected-route media processing.
- Existing Builder behavior is now contractually classified: search index,
  normalized content store, media manifest, route manifest, template manifest,
  sitemap, robots, runtime/static assets, admin app, and build/asset manifests
  are intentionally regenerated Site-wide.
- `buildSite()` creates a full artifact plan even for direct CLI/Builder calls,
  keeping Runtime and non-Runtime builds on the same contract.

## Boundary

```text
Dependency Manifest -> Incremental Planner -> Artifact Plan
  -> Builder V1 route-scoped writes
  -> Builder V1 global derived artifacts
  -> Output Pipeline
```

The plan classifies write responsibility only. Output Pipeline remains the
exclusive writer to `sites/<siteId>/public/dist`.

## Safety

- Route-local files are never inferred from a route outside the validated
  affected-route set.
- Search, sitemap, SEO-derived manifests, and content/route indexes remain
  global until a later contract can prove smaller independent updates correct.
- A full build marks every route and media operation Site-wide.

## Validation

```bash
node --test test/incrementalBuild.test.js test/buildPipeline.test.js \
  test/buildIntegration.test.js test/outputPipeline.test.js \
  test/runtimeContentReader.test.js
git diff --check
```

Result: 26 tests passed, 0 failed.
