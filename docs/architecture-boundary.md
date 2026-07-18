# WPSC v1 Architecture Boundary

Status: `FROZEN FOR V1 REVIEW`

This document defines the subsystem boundaries that WPSC v1.x should preserve.
The goal is to keep the framework extensible without forcing changes inside
Core whenever a new source, theme, runtime workflow, or deployment target is
added.

## Boundary Rule

WPSC subsystems may depend inward on stable contracts, but must not reach across
layers for implementation details.

```text
Source APIs
-> Adapter Layer
-> Compiler
-> Build Engine
-> Static Output

Runtime Kernel
-> Runtime APIs
-> Browser Workflows

Theme System
-> Compiler Contracts
-> Rendered HTML

Plugins
-> Declared Hooks
-> Stable Context
```

No subsystem should import private files from another subsystem when a public
contract or hook exists.

## Subsystems

### Adapter Layer

Owns source integration and normalization.

Examples:

- WordPress adapter.
- WooCommerce adapter.
- WordPress + WooCommerce combined adapter.
- Mock adapter.

May do:

- Fetch source data.
- Authenticate to source APIs server-side.
- Normalize posts, pages, products, terms, media, menus, SEO, and commerce data.
- Return WPSC Content, Term, Media, Menu, and collection data.

Must not do:

- Render HTML.
- Decide final route output.
- Write files to `dist`.
- Know about theme component internals.
- Expose source credentials to browser/runtime frontend code.

### Compiler

Owns converting normalized source data into a site plan.

May do:

- Load config.
- Run adapter and plugin data hooks.
- Create normalized content.
- Create content graph.
- Apply commerce enrichment.
- Create routes.
- Resolve theme/layout metadata.
- Return `sitePlan`.

Must not do:

- Write output files.
- Start servers.
- Handle customer login/session.
- Call browser runtime APIs.
- Mutate adapter-owned raw data after normalization.

### Build Engine

Owns writing build artifacts.

Current areas:

- `src/builder/`
- `src/cache/`
- `src/planner/`
- `src/graph/`
- `src/queue/`
- `src/invalidate/`
- `src/progress/`
- `src/watcher/`
- `src/webhook/`

May do:

- Render pages from `sitePlan.pages`.
- Write HTML, route JSON, fragments, search index, sitemap, robots, manifests.
- Copy public/theme/runtime assets.
- Plan incremental affected routes.
- Cache content, route renders, and assets.
- Serialize rebuild requests.
- Report build progress.

Must not do:

- Normalize WordPress/WooCommerce records directly.
- Own public theme component design.
- Own customer account/order business rules.
- Depend on browser-only globals.

### Runtime Kernel

Owns dynamic customer workflows that cannot be fully static.

Current areas:

- `src/runtime/api/`
- `src/runtime/auth/`
- `src/runtime/account/`
- `src/runtime/cart/`
- `src/runtime/checkout/`
- `src/runtime/order/`
- `src/runtime/session/`
- `src/runtime/commerce/`
- `src/runtime/frontend/`

May do:

- Serve runtime API endpoints.
- Maintain server-side customer session.
- Delegate login to WordPress auth endpoint.
- Read account/order/address data through server-side WooCommerce services.
- Create checkout orders.
- Enhance static pages in the browser.

Must not do:

- Require public pages to be server-rendered.
- Put WooCommerce keys, WP admin credentials, or bridge secrets in frontend JS.
- Rebuild static routes directly.
- Own source adapter normalization.

### Theme System

Owns static storefront rendering.

Current areas:

- `src/theme/`
- `src/templates/`
- `src/blocks/`
- `src/visual-builder/`
- `examples/basic-shop/theme/`

May do:

- Render HTML from route, content, graph, site, and theme context.
- Define components, layouts, blocks, templates, and assets.
- Use WPSC public helper APIs.
- Provide site-specific design.

Must not do:

- Fetch WordPress/WooCommerce data directly.
- Read private runtime session data at build time.
- Write build outputs.
- Change public routing rules.

### Plugin System

Owns extension points.

May do:

- Load project plugins.
- Run declared hooks.
- Allow source, data, render, build, and builder workflow extensions.

Must not do:

- Depend on private Core file paths as public API.
- Mutate frozen content/graph objects in place.
- Bypass security boundaries for source credentials or runtime sessions.

## Dependency Direction

Allowed high-level dependencies:

```text
CLI -> Core/Compiler
CLI -> Dev Server/Webhook/Runtime entrypoints
Compiler -> Adapter contracts
Compiler -> Plugin hooks
Compiler -> Content/Graph/Router/Theme resolver
Build Engine -> SitePlan
Build Engine -> Theme/runtime/public assets
Runtime Kernel -> Runtime services/session/source service wrappers
Theme System -> Public render context/helpers
Plugins -> Public hook context
```

Disallowed high-level dependencies:

```text
Adapter -> Builder
Adapter -> Runtime frontend
Theme -> Adapter implementation
Theme -> Runtime private session
Runtime frontend -> Source credentials
Compiler -> Nginx/VPS/deploy implementation
Build Engine -> WordPress raw schema
Plugin -> Private internal module as stable API
```

## Public vs Internal API

Public APIs are exported from `src/index.js` or documented under `docs/v1*`.

Internal APIs are file paths inside subsystem folders. They may be refactored
within v1 as long as public contracts remain compatible.

Compatibility bridges may exist during v1 freeze, for example:

```text
src/incremental/* -> src/planner/* or src/graph/*
src/webhook/createRebuildQueue.js -> src/queue/createRebuildQueue.js
src/dev-server/createWatchTargets.js -> src/watcher/createWatchTargets.js
```

These bridges protect existing imports while the architecture moves toward
clearer subsystem names.

## V1 Freeze Decisions

1. Public routes remain `domain/slug` in concept and `/slug` in output.
2. Static output remains the primary delivery model.
3. WordPress/WooCommerce remain data sources, not renderers.
4. Runtime exists only for dynamic workflows: auth, account, cart, checkout, order.
5. Themes render from WPSC normalized data and graph, not from source APIs.
6. Product variations stay inside the parent product route/data.
7. Build output includes HTML, route JSON, and fragments.
8. Incremental builds must update changed routes and related artifacts.
9. Public browser code must never contain private source credentials.
10. Plugins extend through declared hooks and public context only.

## Review Checklist

- [ ] Adapter imports do not depend on builder/runtime/theme internals.
- [ ] Compiler returns a site plan and does not write `dist`.
- [ ] Builder writes outputs and does not fetch source data directly.
- [ ] Runtime API keeps private credentials server-side.
- [ ] Runtime frontend imports only browser-safe modules.
- [ ] Theme code renders from public context only.
- [ ] Plugin hooks expose stable context.
- [ ] Public exports in `src/index.js` match documented contracts.
- [ ] Compatibility bridges are documented and intentionally temporary.
- [ ] Tests cover at least one path through source, compile, build, runtime, and webhook.
