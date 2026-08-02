# Commit 016 - Dependency-Aware Incremental Invalidation

Status: PASS

## Problem

A Product webhook rebuilt only the Product route and its direct archive route.
Static pages with embedded featured, related, cross-sell, upsell, or block-level
Product cards could remain stale. Runtime webhook publishing also did not inject
the Site Cache into the publishing coordinator.

## Delivered

- Route dependency graph now recursively discovers Product references embedded
  in route content data, including featured/related/block/collection Product
  objects and Product id/slug references.
- Product, variation, price, and inventory events rebuild Product pages, parent
  Product pages, archives, and every route that embeds the changed Product.
- Incremental planner falls back to a full build when the current Site plan
  cannot map a changed item. This covers deletion and incomplete provider
  payloads without leaving stale public HTML.
- Full builds replace `public/dist` atomically at Output Pipeline ownership,
  removing static files for deleted routes.
- Runtime Site Cache is injected into the webhook publishing coordinator and
  invalidated only after a Job is successfully queued.
- Global build products (search, route data, fragments, SEO, sitemap, robots,
  manifests) continue to be refreshed by the Builder for every build.

## Boundary

```text
Webhook -> Scheduler -> Queue -> Dispatcher -> Build Integration
  -> Runtime V1 Builder -> dependency plan
  -> Output Pipeline -> Site public/dist
```

The Scheduler still owns triggering and retry. The Build Engine still owns build
lifecycle. The Output Pipeline remains the only component that writes or
replaces generated Site output.

## Safety Rule

When WPSC cannot prove that a changed item has complete route coverage, it does
not publish a partial snapshot. It performs a full build instead.

## Validation

```bash
node --test test/incrementalBuild.test.js test/outputPipeline.test.js \
  test/buildIntegration.test.js test/runtimeWebhookReceiver.test.js \
  test/siteCacheService.test.js
git diff --check
```

Result: 20 tests passed, 0 failed.
