# Performance And Cache

Phase 22 adds build caches and parallel rendering for larger WPSC sites.

## Cache Locations

Compile caches are stored outside `dist`, so they survive full output rebuilds:

```txt
.wpsc/cache/content
.wpsc/cache/collections
.wpsc/cache/routes
```

Build output manifests still live inside `dist`:

```txt
dist/.wpsc/manifest.json
dist/.wpsc/assets.json
```

## Content And Collection Cache

Adapter content and collection responses are cached as JSON. For mock projects, the cache key includes the source file path, size, and modified time, so editing `content.json` invalidates the cache.

## Route Render Cache

Rendered route HTML is cached by route path, content data, theme metadata, and the renderer shell fingerprint. WPSC still runs plugin `render` hooks after reading cached route HTML so plugins can keep their behavior.

The homepage route `/` is intentionally not cached during route rendering, so active
homepage design changes are visible on every build.

Manifest cache stats:

```json
{
  "cache": {
    "contentCacheHit": true,
    "collectionCacheHit": true,
    "routeRenderCacheHits": 6,
    "routeRenderCacheMisses": 0
  }
}
```

## Parallel Work

Route rendering and media asset downloads now run through a limited parallel worker. Defaults are conservative and can be tuned internally through compile/build options:

```js
await compile(config, {
  renderConcurrency: 8
});

await buildSite(sitePlan, {
  assetConcurrency: 8
});
```

## Asset Cache Stats

`dist/.wpsc/assets.json` includes cache stats:

```json
{
  "stats": {
    "cached": 1,
    "downloaded": 0,
    "total": 1
  }
}
```

Public URLs are not changed by this phase. The browser-facing route contract remains `domain/slug`.
