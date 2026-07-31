# Sprint 8 Commit 007 - Advanced Website SEO Service

Status: PASS

## Delivered

- Versioned `wpsc.advanced-seo` contract for Rendering Context consumption.
- Site Route Policy-owned canonical URLs for every SEO composition.
- Normalized Product title, description, canonical, Open Graph and JSON-LD.
- Deterministic `WebPage` and `Product` structured data.
- Route Policy-backed pagination links.
- Deterministic sitemap generation with duplicate removal and `noindex` exclusion.
- Existing robots and sitemap output integration remains intact.

## Boundary

Provider SEO metadata is descriptive input only. It cannot replace a canonical
URL owned by the Site Route Policy. SEO stays in the Rendering Context and does
not resolve routes or create a parallel routing system.

## Validation

```bash
node --test test/advancedSeoService.test.js test/seo.test.js test/sharedRenderingContext.test.js test/siteRoutePolicy.test.js
node --check framework/src/seo/createAdvancedSeoService.js
git diff --check
```

Focused Advanced SEO, existing SEO, Shared Rendering Context, Route Policy,
taxonomy archive and Commerce Catalog validation passed with 19 tests.
