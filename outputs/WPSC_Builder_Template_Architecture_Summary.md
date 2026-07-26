# WPSC Builder Template Architecture Summary

Date: 2026-07-11

## Context

This chat continued work on the `wp-static` / WPSC project. The initial focus was checking rsync/build/test status on the VPS at `192.168.1.181`, then the discussion shifted into the intended architecture for the builder.

The main product decision from this conversation:

> WPSC Builder should be a static template builder, not just a page builder and not a runtime frontend builder.

## VPS And Build Work Completed

The project was found locally at:

```text
/Users/tienlavan/Documents/Codex/2026-07-02/hi
```

The VPS project path is:

```text
/home/data/sites/wp-static
```

SSH to the VPS worked. A full rsync dry-run showed that syncing the whole local repo with `--delete` would have deleted the real build output on the VPS, because local `examples/basic-shop/dist` was a small demo build while the VPS had a much larger real-site build.

Safe sync was used instead, excluding:

```text
.git/
node_modules/
.env
.DS_Store
examples/basic-shop/dist/
examples/basic-shop/.wpsc/
```

The VPS real build was restored and verified:

```text
Project: Tin Sinh Phat
Pages: 169
Remote assets downloaded: 233
dist: 1393 files, 111M
```

## Test Failure And Fix

After syncing, `npm test` initially failed on the VPS with ESM loading errors:

```text
Unexpected token 'export'
```

The root cause was that temp project copies used during tests did not always have a `package.json` declaring:

```json
{
  "type": "module"
}
```

Also, the VPS default `ssh` environment was using:

```text
Node v18.19.1
```

while the project requires:

```text
Node >= 20
```

The VPS already had Node via nvm:

```text
v20.19.0
v26.3.1
```

The correct server runtime command is:

```bash
source ~/.nvm/nvm.sh && nvm use 26.3.1
```

Implemented fixes:

- Added `src/shared/importProjectModule.js`.
- Updated `src/core/loadConfig.js` to use the shared project module importer.
- Updated `src/theme/resolveTheme.js` to use the shared importer.
- Updated `src/plugins/loadPlugins.js` to use the shared importer.
- Added `examples/basic-shop/package.json` with `"type": "module"`.

Verification after the fix:

```text
Local npm test: 128/128 pass
VPS npm test using Node 26: 128/128 pass
VPS real build: pass
VPS dist: 1393 files, 111M
```

## Homepage Storefront Work Completed

Before the architecture discussion, the homepage had been improved using hard-coded theme layout code.

Files involved:

```text
examples/basic-shop/theme/layouts/page.js
examples/basic-shop/public/storefront.css
```

The homepage `/` was given the storefront shell used by the UI demo:

- Header
- Search
- Category nav
- CTA buttons
- Featured product grid
- Footer

Local verification:

```text
npm test: 128/128 pass
node src/cli/index.js build --project examples/basic-shop --changed page:home
Pages: 1
Incremental: /
```

VPS real build after syncing:

```text
Project: Tin Sinh Phat
Pages: 169
Remote assets downloaded: 233
dist: 1393 files, 111M
```

Important note: this homepage hard-code is now considered a temporary step, not the final direction.

## Architecture Decision

The user clarified the desired architecture:

Homepage and all specific page types should start as blank canvases. The builder should be used to create templates for each type of route/content, such as:

- `home`
- `page`
- `post`
- `product`
- `product_cat`
- taxonomy archive
- other route types later

Those builder templates should then be used at build time to generate static HTML files with real data.

The intended pipeline is:

```text
blank canvas
-> builder template for a route/content type
-> bind real content/term/graph data
-> build
-> static HTML file
```

Example for products:

```text
builder template: product
data: product A, product B, product C
output:
  product-a.html
  product-b.html
  product-c.html
```

Example for product categories:

```text
builder template: product_cat
data: category terms + matching products
output:
  in-hop-giay.html
  decal.html
  catalogue.html
```

## What Builder Means In WPSC

The builder is not just a page editor.

It should become a static template builder:

```text
Builder template + data context -> static HTML
```

The builder does not render the production site at runtime in the browser. Production output remains static files.

The builder should create reusable layout templates by context/type. A single `product` template can render many product pages. A single `product_cat` template can render many category archive pages.

## Desired Responsibilities

Theme should provide:

- Block library.
- Design tokens.
- CSS.
- Block renderers.
- Minimal fallback behavior.

Builder should provide:

- Blank canvas.
- Template documents.
- Template editing workflow.
- Saved template layouts for route/content types.
- Data binding configuration.

Build pipeline should provide:

- Route context.
- Template resolution.
- Data graph.
- Static HTML output.

## Proposed Core Concepts

### Template Scope

Templates should be addressable by scope, for example:

```text
home
page
post
product
taxonomy:product_cat
archive
```

Later, overrides can exist by slug or id:

```text
page:about-us
product:hop-nap-cai-giay-ivory-300gsm-tsp07
term:product_cat:in-hop-giay
```

### Template Storage

Possible template paths:

```text
layouts/templates/home.json
layouts/templates/page.json
layouts/templates/post.json
layouts/templates/product.json
layouts/templates/taxonomy.product_cat.json
layouts/templates/archive.json
```

### Template Resolution

The system needs a resolver like:

```text
resolveTemplateForRoute(route, graph, config)
```

Resolution priority could be:

1. Exact route/content override.
2. Content type template.
3. Taxonomy template.
4. Archive template.
5. Fallback template.

### Render Context

The renderer should receive context like:

```text
content
term
route
graph
site
```

Blocks should bind to that context instead of hard-coding page data.

## Key Agreement

The current hard-coded layout files such as `page.js`, product layout code, or archive layout code should become thin adapters only:

```text
resolve template
-> render template with context
-> return HTML
```

They should not own the real layout design long-term.

## Recommended Next Coding Direction

Do not continue polishing the hard-coded homepage.

The next implementation should build the foundation for template-driven static generation:

1. Add a `resolveTemplateForRoute` layer.
2. Define template storage for builder-created templates.
3. Add the first homepage template JSON.
4. Render `/` from that template JSON at build time.
5. Keep output as static `dist/index.html`.
6. Extend the same mechanism to `page`, `post`, `product`, and `product_cat`.

## One-Sentence Summary

WPSC should become a static site generator where the builder creates reusable templates for each route/content type, and the build pipeline applies those templates to real data to produce static HTML files.
