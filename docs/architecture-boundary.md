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

## Owner / Input / Output / Public API Matrix

| Subsystem | Owner | Input | Output | Public API | Forbidden |
| --- | --- | --- | --- | --- | --- |
| Adapter Layer | Source integration | Source API credentials, source config, raw WP/Woo/mock data | Normalized contents, terms, media, menus, collections | Adapter contract, `getContents()`, `getCollections()`, optional cache identity | Rendering HTML, writing `dist`, deciding final output paths, exposing credentials to browser |
| Compiler | Core compilation | Project config, adapter output, plugin hooks, theme metadata | Immutable `sitePlan`, routes, graph, pages | `compile(config, options)`, compiler contract | Writing files, running servers, handling sessions, depending on deployment/VPS details |
| Build Engine | Static artifact writer | `sitePlan`, output paths, public assets, runtime assets, incremental plan | HTML, fragments, route JSON, search index, SEO files, manifests, copied assets | `buildSite(sitePlan, options)`, build result, progress events | Fetching source data directly, owning customer account rules, knowing raw WP schema |
| Runtime Kernel | Dynamic commerce/account workflows | Runtime HTTP request, session cookie, runtime config, server-side source service wrappers | Runtime JSON responses, customer session, order/account data, browser enhancements | Runtime API routes, runtime contract, frontend runtime modules | Rebuilding static routes directly, leaking private credentials, requiring public SSR |
| Theme System | Static storefront presentation | Route, content, graph, site, theme config, block/template data | HTML markup and static asset references | Theme contract, layout functions, component/block APIs | Calling WP/Woo APIs directly, writing build output, reading private runtime sessions |
| Plugin System | Extension points | Hook context, config, contents, routes, build/render lifecycle data | Hook results, transformed public data, render/build extensions | Plugin contract, declared hooks | Importing private modules as stable API, mutating frozen data in place, bypassing security boundaries |

## Allowed / Forbidden Dependency Matrix

Legend:

```text
Allowed: stable/public dependency is allowed.
Forbidden: direct private dependency is forbidden.
Hook only: dependency must go through plugin hook/context.
Data only: dependency is allowed through normalized data, not implementation imports.
```

| From / To | Adapter Layer | Compiler | Build Engine | Runtime Kernel | Theme System | Plugin System |
| --- | --- | --- | --- | --- | --- | --- |
| Adapter Layer | Allowed internal | Forbidden | Forbidden | Forbidden | Forbidden | Hook only |
| Compiler | Allowed via contract | Allowed internal | Forbidden | Forbidden | Data only | Hook only |
| Build Engine | Forbidden | Data only via `sitePlan` | Allowed internal | Data only for copied runtime assets | Data only for copied theme assets | Hook only |
| Runtime Kernel | Data only via server-side services | Forbidden | Forbidden | Allowed internal | Forbidden | Hook only |
| Theme System | Forbidden | Data only via render context | Forbidden | Forbidden except public links/data attributes | Allowed internal | Hook only |
| Plugin System | Hook context only | Hook context only | Hook context only | Hook context only | Hook context only | Allowed internal |

Forbidden examples:

```text
src/theme/* -> src/adapters/wordpress/*
src/runtime/frontend/* -> source credentials or server-only Woo client
src/adapters/* -> src/builder/*
src/builder/* -> raw WordPress post/product schema
project plugin -> undocumented private Core file as stable API
```

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

- `framework/src/builder/`
- `framework/src/cache/`
- `framework/src/planner/`
- `framework/src/graph/`
- `framework/src/queue/`
- `framework/src/invalidate/`
- `framework/src/progress/`
- `framework/src/watcher/`
- `framework/src/webhook/`

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

- `framework/src/runtime/api/`
- `framework/src/runtime/auth/`
- `framework/src/runtime/account/`
- `framework/src/runtime/cart/`
- `framework/src/runtime/checkout/`
- `framework/src/runtime/order/`
- `framework/src/runtime/session/`
- `framework/src/runtime/commerce/`
- `framework/src/runtime/frontend/`

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

- `framework/src/theme/`
- `framework/src/templates/`
- `framework/src/blocks/`
- `framework/src/visual-builder/`
- `fixtures/basic-shop/theme/`

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

Public APIs are exported from `framework/src/index.js` or documented under `docs/v1*`.

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
- [ ] Public exports in `framework/src/index.js` match documented contracts.
- [ ] Compatibility bridges are documented and intentionally temporary.
- [ ] Tests cover at least one path through source, compile, build, runtime, and webhook.
