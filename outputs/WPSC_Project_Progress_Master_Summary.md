# WPSC Project Progress Master Summary

Date: 2026-07-11

## Purpose

This document summarizes the current WPSC project state after reviewing the project markdown files, including:

- `README.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `outputs/*.md`
- `docs/*.md`
- `docs/v1/*.md`
- `rfcs/*.md`
- package README files

It also incorporates the latest architectural decision from the conversation:

> WPSC Builder should become a static template builder for route/content types, not just a page editor and not a runtime frontend renderer.

## Current Big Picture

WPSC has evolved from a small static commerce prototype into a documented static commerce framework for WordPress/WooCommerce.

The existing markdown says WPSC v1.0 is production-framework ready, with stable contracts for:

- Core compile/build APIs.
- Adapter APIs.
- Theme APIs.
- Plugin APIs.
- Visual builder foundations.
- Deployment workflows.
- Public route data.
- Runtime commerce boundaries.

However, the newest direction changes the next priority:

```text
Old next direction:
  Polish hard-coded storefront homepage/layouts.

New next direction:
  Build the template-builder architecture so homepage, page, post, product,
  product category, and archives are rendered from builder templates.
```

The hard-coded storefront homepage work should now be considered transitional, not the final architecture.

## Verified Working State

Recent verification from the working session:

```text
Local npm test: 128/128 pass
VPS npm test using Node 26 via nvm: 128/128 pass
VPS real build: pass
Real site build: Tin Sinh Phat
Pages: 169
Remote assets downloaded: 233
dist: 1393 files, 111M
```

Important VPS runtime note:

```bash
source ~/.nvm/nvm.sh && nvm use 26.3.1
```

The default non-interactive VPS node was `v18.19.1`, while the project requires Node `>=20`.

## What Has Been Built

### Core Static Pipeline

Status: `DONE`

The initial architecture established a clear pipeline:

```text
CLI
-> Config
-> Adapter
-> Content
-> Router
-> Renderer
-> Builder
-> dist/*.html
```

Completed capabilities:

- ESM Node package.
- Node engine target `>=20`.
- Immutable `Content` model.
- Mock adapter.
- Route generation from flat SEO slugs.
- Duplicate route detection.
- Plain JavaScript layout rendering.
- HTML escaping helper.
- Static file output.
- CLI build command.
- Basic Shop example.

### Tooling And CLI

Status: `DONE`

Completed capabilities:

- `build`
- `create`
- `clean`
- `doctor`
- `serve`
- `dev`
- `--help`
- `--version`
- Build summary output.
- Config loader.
- Project template creation.
- Public asset copying.
- Static serve command.
- Browser-ready example styles.

### Route And URL Contract

Status: `DONE`

The route contract is consistent across docs:

```text
domain/slug
```

Public routes stay flat:

```text
/                         -> homepage
/gioi-thieu               -> page
/thu-webhook-node-js      -> post
/hop-nap-cai-tsp01        -> product
/decal-giay               -> taxonomy/category archive
```

The project intentionally avoids public prefixes such as:

```text
/product/slug
/category/slug
/post/slug
```

Static output remains flat for Nginx/CDN:

```text
dist/index.html
dist/gioi-thieu.html
dist/hop-nap-cai-tsp01.html
```

### Core Hardening

Status: `DONE`

Completed capabilities:

- Typed errors such as config/build/route/adapter errors.
- Quiet/verbose logging.
- Normalized config paths.
- Build manifest.
- Content manifest.
- Route manifest.
- Integration tests.
- Stable public API draft promoted later to v1 docs.

### WordPress Adapter

Status: `DONE`

Completed capabilities:

- WordPress REST collection fetching with pagination.
- Pages and posts.
- Custom post types.
- Taxonomies and terms.
- Media library items.
- Menus.
- `_embed` data.
- ACF normalization.
- Rank Math SEO normalization.
- WordPress content normalized into WPSC `Content`.
- Auth support through environment-backed Application Password or Bearer token.

Key principle:

```text
WordPress is a source of data, not the frontend rendering engine.
```

### WooCommerce Adapter

Status: `DONE`

Completed capabilities:

- Product fetching with pagination.
- Product categories and tags.
- Product variations.
- Price, sale price, stock, SKU.
- Product images and categories.
- Rank Math product SEO.
- Combined WordPress + WooCommerce adapter.
- Credentials loaded from env.

### Unified Content Graph

Status: `DONE`

Completed capabilities:

- Content collection model.
- Term model.
- Media model.
- Menu model.
- Relation resolver.
- Lookups by id, slug, type, and term.

Purpose:

```text
Theme/builder can query WPSC graph instead of caring whether data came from WordPress or WooCommerce.
```

### SEO Output System

Status: `DONE`

Completed capabilities:

- `<title>`
- Meta description.
- Canonical.
- Robots meta.
- Open Graph.
- Twitter Cards.
- `sitemap.xml`
- `robots.txt`
- Site-level fallbacks.

SEO output renders normalized WPSC SEO data. It does not know about Rank Math directly.

### Theme System

Status: `DONE`, but now partially superseded by the template-builder direction.

Completed capabilities:

- Theme resolver.
- Fallback layout.
- Content-type layouts.
- Components module.
- Theme assets.
- Theme metadata.
- Theme block libraries.
- Project block overrides.

Current limitation:

The current theme system can still encourage hard-coded layout modules like:

```text
theme/layouts/page.js
theme/layouts/product.js
```

The new target is to make these thin adapters that resolve and render builder templates.

### Asset And Image Pipeline

Status: `DONE`

Completed capabilities:

- Remote media download.
- Download cache.
- Image URL rewriting.
- Asset manifest.
- Theme asset copying.
- Asset cache stats.

### Dev Server And Watch Mode

Status: `DONE`

Completed capabilities:

- Watch content.
- Watch theme files.
- Watch config.
- Rebuild.
- Live reload injection.

### Plugin System

Status: `DONE`

Stable hooks:

- `data({ contents, collections }, context)`
- `routes(routes, context)`
- `render({ route, html }, context)`
- `buildStart(payload, context)`
- `buildEnd(payload, context)`

### Package Extraction

Status: `DONE`

Workspace/package boundaries exist for:

- `@wpsc/shared`
- `@wpsc/core`
- `@wpsc/adapters`
- `@wpsc/router`
- `@wpsc/renderer`
- `@wpsc/builder`
- `@wpsc/cli`

RFC-0002 documents monorepo extraction as a drafted architectural concern.

### Real Source Integration

Status: `DONE`

Completed capabilities:

- Real WordPress/WooCommerce project checklist.
- `.env` support.
- WordPress Application Password auth.
- WordPress Bearer token auth.
- WooCommerce env credentials.
- Real-source edge case handling.

### Preview And Private Data Safety

Status: `DONE`

Completed capabilities:

- Preview build mode.
- Draft/private source item support.
- Preview token guard.
- Public build excludes private content.

### Customer Auth Strategy

Status: `DONE`

The docs establish a boundary:

- Static catalog does not require login.
- Customer/session data belongs to a runtime service if needed.
- WooCommerce/WordPress secrets must never be exposed in frontend static output.

Forbidden frontend secrets include:

- `WPSC_WOO_CONSUMER_SECRET`
- `WPSC_WP_APP_PASSWORD`
- `WPSC_WP_BEARER_TOKEN`
- `JWT_SIGNING_SECRET`
- `SESSION_SECRET`

### Runtime Commerce API

Status: `DONE` as scaffold/foundation.

Endpoints documented:

- `GET /health`
- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/:productId`
- `POST /checkout`
- `GET /orders/:orderId`

Boundary:

```text
Runtime commerce API is optional and separate from static public rendering.
```

### Customer Account UI

Status: `DONE` as helper layer.

Helpers documented:

- `renderLoginView()`
- `renderLogoutView()`
- `renderAccountDashboard(customer)`
- `renderOrderHistoryView(orders)`
- `renderAddressBookView(addresses)`

### Taxonomy And Archive Pages

Status: `DONE`

Completed capabilities:

- Category/tag/product category archive generation.
- Archive pagination.
- Sitemap coverage.
- Flat URL contract.
- Route data output.

### Webhook Rebuild Workflow

Status: `DONE`

Completed capabilities:

- Webhook receiver.
- Payload normalization.
- Queue guard.
- Validation report.
- Editor workflow notes.

### Incremental Build Engine

Status: `DONE`

Completed capabilities:

- Changed item parsing.
- Route dependency graph.
- Incremental build planning.
- A changed product rebuilds its route and archives containing it.
- Changed menus/media/theme files can trigger wider rebuild.
- Shared outputs refresh after incremental builds.

### Performance And Cache

Status: `DONE`

Completed capabilities:

- Content cache.
- Collection cache.
- Route render cache.
- Asset cache.
- Parallel route rendering.
- Cache stats in build manifest.

### Public Route Data

Status: `DONE`

Completed capabilities:

- `dist/data/routes/{slug}.json`
- Route metadata.
- Site metadata.
- Public content data.
- SEO payload.
- Media/taxonomy/commerce/variant payloads.
- Runtime-safe route data.

Security boundary:

Route JSON must not contain:

- WooCommerce consumer secrets.
- WordPress credentials.
- Customer sessions.
- Orders/account data.
- Private operational fields.

### Visual Builder Foundation

Status: `DONE` as foundation, not yet aligned with the new full template-builder target.

Completed capabilities:

- Block schema system.
- Props validation.
- Data binding schema.
- Starter commerce blocks.
- Layout JSON documents.
- Content type mapping.
- Nested section/block nodes.
- Responsive settings.
- Layout renderer.
- Content bindings.
- Commerce blocks.
- Taxonomy blocks.
- Missing-block fallbacks.

### Builder UI Prototype

Status: `DONE` as prototype.

Completed capabilities:

- Dependency-free builder UI prototype.
- Block palette.
- Canvas ordering.
- Props editing.
- Live preview.
- JSON export/save layout behavior.

Current builder UI documented blocks include:

- `core/heading`
- `core/content-text`
- `commerce/product-price`
- `commerce/archive-links`

### Production Builder Foundations

Status: `DONE` as foundation.

Completed capabilities:

- Editor auth.
- Layout revisions.
- Draft/published state.
- Publish flow.
- Rebuild trigger.

### Advanced Commerce

Status: `DONE`

Completed capabilities:

- Parent product variants.
- Sale/in-stock/out-of-stock collections.
- Related products.

### Deployment Integrations

Status: `DONE`

Documented deployment targets:

- Nginx.
- rsync to VPS.
- Cloudflare Pages.
- S3/R2.
- GitHub Actions.

### API Stabilization And v1

Status: `DONE` in docs.

Stable docs exist for:

- API stability.
- Migration policy.
- Deprecation policy.
- v1 Adapter API.
- v1 Plugin API.
- v1 Theme API.

## Current Transitional UI Work

The storefront UI work created:

- Tailwind storefront CSS pipeline.
- Storefront design token foundation.
- Single-route UI demo at `/ui-storefront-demo`.
- Demo header/footer/shell.
- Homepage hard-coded storefront shell applied to `/`.

Recent verification:

```text
Local tests: 128/128 pass
VPS real build: pass
```

But this direction has now been reclassified:

```text
Hard-coded storefront homepage = transitional work.
Final direction = builder templates render homepage and all page types.
```

## Major Architectural Decision From Latest Conversation

The user clarified the intended builder model:

> Homepage and all page types should start as blank canvases. The builder should create templates for each type of page: post, page, product, product category, taxonomy archive, and so on. The build pipeline applies those templates to the real data and outputs static files.

This supersedes the idea of polishing hard-coded `page.js`, `product.js`, or archive renderers as the main layout system.

The target model:

```text
blank canvas
-> builder template for route/content type
-> bind real content/term/graph data
-> static build
-> HTML/CSS/JS/JSON files in dist
```

The public site remains static:

```text
Browser -> Nginx/CDN -> static files
```

The builder/admin can be dynamic:

```text
Admin -> builder UI -> template JSON -> rebuild affected static routes
```

## New Target Architecture

### Builder Role

Builder should be a static template builder.

It should create reusable templates for scopes such as:

- `home`
- `page`
- `post`
- `product`
- `taxonomy:product_cat`
- `taxonomy:category`
- `archive`
- exact route/content overrides later

### Theme Role

Theme should provide:

- Block library.
- Component renderers.
- Design tokens.
- CSS.
- Asset conventions.
- Minimal fallback layout.

Theme should not be the primary owner of hard-coded page structure.

### Build Pipeline Role

Build pipeline should:

1. Create routes.
2. Identify render context.
3. Resolve a builder template.
4. Render template with `content`, `term`, `route`, `graph`, `site`.
5. Write static HTML and route data.

### Thin Layout Adapter Role

Existing theme layout files should eventually become thin adapters:

```text
resolve template
-> render template with context
-> return HTML
```

They should not contain long hard-coded storefront layouts.

## New Phase Plan To Add

The existing roadmap ends at v1.0 and production readiness, but the new architecture needs another roadmap section.

Recommended new phases:

### Phase 33 - Template Resolution Core

Status: `NEW / NOT STARTED`

Goal:

Add a template resolution layer that chooses the correct builder template for each route.

Deliverables:

- `resolveTemplateForRoute(route, graph, config)`.
- Template scope model.
- Resolution order:
  1. Exact route/content override.
  2. Homepage template.
  3. Content type template.
  4. Taxonomy template.
  5. Archive template.
  6. Theme fallback.
- Tests for route-to-template matching.

### Phase 34 - Template Storage Convention

Status: `NEW / NOT STARTED`

Goal:

Define where builder-created templates live.

Candidate convention:

```text
layouts/templates/home.json
layouts/templates/page.json
layouts/templates/post.json
layouts/templates/product.json
layouts/templates/taxonomy.product_cat.json
layouts/templates/archive.json
```

Deliverables:

- Template loader.
- Template validation.
- Template manifest/index.
- Docs for template storage and naming.

### Phase 35 - Homepage From Builder Template

Status: `NEW / NOT STARTED`

Goal:

Make `/` render from a builder template JSON instead of hard-coded `renderStorefrontHome()`.

Deliverables:

- First `home.json` template.
- Data-aware blocks needed for homepage.
- Build-time render to `dist/index.html`.
- Tests proving homepage uses template JSON.
- Keep output static.

### Phase 36 - Page And Post Templates

Status: `NEW / NOT STARTED`

Goal:

Render normal `page` and `post` routes from builder templates.

Deliverables:

- `page.json`.
- `post.json`.
- Content body/title/SEO blocks.
- Breadcrumb block.
- Tests with multiple pages/posts using the same template.

### Phase 37 - Product Template

Status: `NEW / NOT STARTED`

Goal:

Render all WooCommerce product pages from one reusable builder template.

Deliverables:

- `product.json`.
- Product title block.
- Product gallery block.
- Product price block.
- Stock/SKU block.
- Variant selector block.
- CTA/add-to-cart block boundary.
- Product description/spec block.
- Related products block.
- Tests showing one template renders multiple product static files.

### Phase 38 - Taxonomy And Product Category Templates

Status: `NEW / NOT STARTED`

Goal:

Render taxonomy archives from builder templates.

Deliverables:

- `taxonomy.product_cat.json`.
- Optional `taxonomy.category.json`.
- Archive title/description block.
- Product grid block.
- Child category/tree block.
- Sort/filter shell block.
- Pagination block.
- Tests for flat URL archives.

### Phase 39 - Builder UI Template Manager

Status: `NEW / NOT STARTED`

Goal:

Expose template management in the builder UI.

Deliverables:

- Blank canvas for each template scope.
- Template scope selector.
- Save/publish template.
- Preview template with sample content.
- Preview exact route using selected content/product/term.

### Phase 40 - Composite Components And Slots

Status: `NEW / NOT STARTED`

Goal:

Support larger builder components such as Header/Footer with nested rows, columns, and slots.

Deliverables:

- Composite component JSON.
- Header row/column slot model.
- Footer column slot model.
- Slot validation.
- Responsive visibility/settings.

### Phase 41 - Static MPA Enhanced Navigation

Status: `PLANNED / PARTIALLY DOCUMENTED`

Goal:

Add fragment HTML output so static pages can navigate faster after first load.

Existing docs say route JSON exists but fragments do not.

Deliverables:

- `dist/fragments/{slug}/main.html`.
- Enhanced navigation script.
- Fallback to normal full-page navigation.
- Metadata update from `data/routes/{slug}.json`.

### Phase 42 - Dynamic Widget Boundaries

Status: `PLANNED`

Goal:

Define how dynamic widgets work without breaking static rendering.

Examples:

- Best-selling products.
- Recently viewed products.
- Cart/account widgets.
- Runtime commerce widgets.

Deliverables:

- Static-first widget contract.
- Optional hydration boundary.
- Runtime endpoint contract where needed.

### Phase 43 - Multi-Site Layout/Data Model

Status: `PLANNED`

Goal:

Prepare WPSC for multiple sites using `siteId`.

Candidate source structure:

```text
data/sites/{siteId}/content/
data/sites/{siteId}/layouts/
data/sites/{siteId}/components/
data/sites/{siteId}/routes/
```

Deliverables:

- Site-aware config.
- Site-aware template paths.
- Site-aware build outputs.

## Phases That Are Done But Need Reframing

Some existing phases are complete technically, but their interpretation should change under the new architecture.

### Theme System

Old meaning:

Theme layouts can define page/product/archive layout directly.

New meaning:

Theme provides blocks/components/CSS/fallbacks. Builder templates own primary layout structure.

### Visual Builder Layouts

Old meaning:

Builder layouts exist as a visual-builder foundation.

New meaning:

Builder layouts become the primary template source for static generation.

### Production Builder

Old meaning:

Builder can save/publish layout JSON.

New meaning:

Builder must manage template scopes and trigger rebuilds for all affected static routes.

### Storefront UI

Old meaning:

Polish homepage/product/category layouts in theme code.

New meaning:

Storefront UI patterns should become block/template examples in builder JSON.

## Remaining Gaps

### 1. Template Resolution Is Not The Main Render Path Yet

Docs already describe visual builder layout JSON and content type mapping, but current theme rendering can still use hard-coded layout modules.

Needed:

```text
route -> template scope -> builder template -> renderLayout -> static HTML
```

### 2. Homepage Is Still Transitional

The latest homepage work applies a storefront shell in code. It should be replaced by:

```text
layouts/templates/home.json
```

### 3. Product And Taxonomy Builder Templates Need To Become Real

Docs mention product/taxonomy blocks, but the next milestone should prove:

```text
one product template -> many product HTML files
one product_cat template -> many category archive HTML files
```

### 4. Fragment HTML Is Still Missing

Docs state:

```text
dist/data/routes/{slug}.json exists
dist/fragments/{slug}/main.html is not implemented yet
```

This is required for the planned Static MPA + Enhanced Navigation model.

### 5. Composite Component UX Is Still Mostly Architectural

The static builder notes describe:

- Header rows.
- Columns.
- Slots.
- Composite components.
- Responsive visibility.

But this needs implementation and UI integration.

### 6. Builder UI Is Still Prototype-Level

The builder UI exists, but planned template-manager capabilities are not yet fully captured as the main workflow.

Needed:

- Pick template scope.
- Open blank canvas.
- Preview against real/sample data.
- Save draft.
- Publish.
- Rebuild affected routes.

### 7. Docs Need A New Master Roadmap

`outputs/WPSC_Revised_Master_Roadmap.md` currently ends at v1.0. It does not yet include the new static template-builder phases.

This file should be used as the basis for a new roadmap update.

## Recommended Immediate Next Steps

### Step 1

Stop expanding the hard-coded homepage layout.

### Step 2

Implement `resolveTemplateForRoute`.

### Step 3

Create a `home.json` builder template and render `/` from it.

### Step 4

Add tests proving:

```text
homepage route uses builder template
output remains static HTML
missing template falls back safely
```

### Step 5

Repeat the same pattern for:

- `page`
- `post`
- `product`
- `taxonomy:product_cat`

### Step 6

Update the official roadmap docs so future work follows the template-builder architecture.

## Tracking Table

| Area | Status | Notes |
| --- | --- | --- |
| Mini core static build | Done | Core pipeline works. |
| CLI/dev tooling | Done | Build/create/clean/doctor/serve/dev documented. |
| WordPress adapter | Done | Includes ACF, media, terms, Rank Math. |
| WooCommerce adapter | Done | Includes products, terms, variations, SEO. |
| Unified graph | Done | Data source independent graph exists. |
| SEO output | Done | Metadata, sitemap, robots. |
| Theme system | Done, needs reframing | Should support builder templates, not own layout structure. |
| Asset pipeline | Done | Remote media and cache supported. |
| Plugin system | Done | Stable hook docs. |
| Incremental build | Done | Dependency graph and changed routes. |
| Performance cache | Done | Content/route/asset cache and parallel work. |
| Public route JSON | Done | Route JSON exists. |
| Route fragments | Not done | Needed for enhanced navigation. |
| Visual builder foundation | Done | Layout JSON and renderer exist. |
| Builder UI prototype | Done | Palette/canvas/props/preview/export. |
| Production builder foundation | Done | Auth/revisions/draft/publish/rebuild trigger. |
| Template resolution core | Not done | New priority. |
| Homepage from builder template | Not done | Current homepage is transitional hard-code. |
| Product template from builder | Not done | Needed for real template-builder model. |
| Product category template from builder | Not done | Needed for taxonomy archive model. |
| Template manager UI | Not done | Needed for real builder workflow. |
| Composite header/footer builder | Planned | Described in architecture notes. |
| Multi-site model | Planned | Described but not primary implementation yet. |

## Summary

WPSC already has a strong static commerce foundation: data adapters, graph, SEO, routing, build output, incremental rebuilds, caching, deployment docs, and a visual builder foundation.

The key unfinished product direction is to make the builder the primary source of layout templates.

The next major milestone should be:

```text
Builder template JSON becomes the render source for homepage,
then page/post/product/product_cat templates,
while output remains static HTML files served directly by Nginx/CDN.
```
