# Sprint 7 Commit 007 - Shared Rendering Context

## Delivered

- Stable Theme Composition contract: `wpsc.rendering-context` version 1.
- One immutable, Site-scoped context containing Site configuration, normalized
  content, navigation, media, routing, SEO and Theme metadata.
- Builder page rendering creates the context once and passes the same service
  values to Theme layouts.
- Existing layout arguments (`content`, `site`, `navigation`, `media`,
  `routing`, `seo`, `theme`) remain available as compatibility aliases.
- SEO tags consume the SEO object already composed in the context instead of
  independently recomputing Theme-facing data.
- Visual template rendering receives content and Site settings from the same
  context while retaining the existing Theme block registry.

## Boundary

```text
Shared Website Services
  -> Immutable Rendering Context
  -> Theme Layout
  -> Builder HTML
```

The context contains no Source Adapter, WordPress client, repository,
credentials, Scheduler or Output Pipeline reference. Theme remains a
presentation component and cannot use this contract to retrieve source data.

## Compatibility

Existing themes do not need an immediate rewrite because their top-level
layout arguments remain present. New themes should prefer `context` as the
stable composition input.

## Validation

```bash
node --test test/sharedRenderingContext.test.js test/themeRenderer.test.js test/seo.test.js test/siteRoutePolicy.test.js
node --test test/compilePreparedSite.test.js
node framework/src/cli/index.js --help
git diff --check
```

The focused contract suite passes (13 tests), and the prepared Runtime
integration passes. Two broader template-resolution tests still fail because
the example template directory/layout references were moved during Project
Layout Normalization; that pre-existing example-material issue is outside C07.
