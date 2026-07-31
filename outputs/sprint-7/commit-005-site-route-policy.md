# Sprint 7 Commit 005 - Site Route Policy

## Delivered

- Site-scoped Route Policy contract: `wpsc.site-route-policy` version 1.
- Deterministic resolution for homepage, normal content, WordPress source
  permalinks, configured permalink templates and nested paths.
- Site-scoped canonical URL generation from the configured Site URL.
- Stable normalized redirect contract with `from`, `to` and HTTP status.
- Deterministic not-found route: `/404` with output `404.html`.
- Builder writes `.wpsc/routes.json`, containing canonical routes, redirects,
  404 policy, Site identity and Site URL.
- SEO uses an absolute Route Policy canonical when available, while explicit
  source SEO canonical remains higher priority.

## Flow

```text
Normalized Content + Site Configuration
  -> Site Route Policy
  -> Builder Routes / SEO
  -> .wpsc/routes.json
  -> Static Output
```

## Boundary

The Route Policy owns path and route metadata only. It does not edit WordPress
permalinks, persist local content, call the Scheduler, or implement a separate
server redirect runtime. Deployment adapters can consume the stable redirect
rules later.

## Compatibility

Existing Builder output paths remain unchanged for ordinary slugs, including
`index.html` for the homepage. WordPress source links are used only as a
normalized path source; their source host is never copied into the static Site
canonical URL.

## Validation

```bash
node --test test/siteRoutePolicy.test.js test/createRoutes.test.js test/seo.test.js test/mediaService.test.js test/assetPipeline.test.js
node framework/src/cli/index.js --help
git diff --check
```

All checks pass (11 tests).
