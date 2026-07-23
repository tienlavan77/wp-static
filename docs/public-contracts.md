# WPSC v1 Public Contracts

Status: `FROZEN FOR V1 REVIEW`

This document defines the public contracts that WPSC v1.x promises to preserve.
The purpose is to let new sources, themes, runtime services, and plugins extend
the framework without changing Core internals.

## Contract Rule

Public contracts are the only supported integration surface for v1.x.

An integration may rely on:

- Root exports from `src/index.js`.
- Files documented under `docs/v1*`.
- The contracts in this document.
- Declared plugin hooks and runtime endpoints.

An integration must not rely on:

- Private implementation files inside subsystem folders.
- Source-specific raw WordPress/WooCommerce response shapes after normalization.
- Runtime secrets or server-only services from browser code.
- Build cache file layout as a stable API.

## Adapter Contract

Adapters connect WPSC to a source system and return normalized build data.

### Owner

Adapter Layer.

### Required API

```js
const adapter = {
  async getContents(context) {
    return [];
  }
};
```

`getContents()` returns an array of records accepted by `createContent()` or
already-normalized content models.

### Optional API

```js
const adapter = {
  async getCollections(context) {
    return {};
  },

  getCacheKey(context) {
    return "source-cache-key";
  }
};
```

`getCollections()` may return named data groups such as:

- `terms`
- `media`
- `menus`
- `products`
- `posts`
- `pages`
- source-specific collections that plugins/themes may read after normalization

`getCacheKey()` returns a stable identity for source cache invalidation.

### Input

- Normalized project config.
- Project paths.
- Source credentials resolved server-side.
- Build/cache options.

### Output

- Normalized content inputs.
- Collections for terms, media, menus, products, SEO, and commerce data.
- Optional source cache key.

### Must Preserve

- No browser-exposed credentials.
- Source-specific data normalized before routing/rendering.
- Stable IDs/slugs/types for content and terms.
- Product variations embedded in the parent product data, not standalone public routes.

### Must Not Do

- Render HTML.
- Write build output.
- Start runtime servers.
- Depend on theme component internals.

## Compiler Contract

The compiler turns config + adapter output into a site plan.

### Owner

Compiler/Core.

### Required API

```js
const sitePlan = await compile(config, options);
```

### Input

- Validated config.
- Adapter output.
- Plugin data/route/render hooks.
- Theme metadata.
- Build options such as preview, cache bust, and cache directory.

### Output

```js
{
  graph,
  pages,
  routes,
  theme,
  cache
}
```

`routes` describe URL/output mapping.

`pages` contain rendered page records ready for the Build Engine.

`graph` exposes normalized content, terms, media, menus, and lookup helpers.

### Must Preserve

- Compiler does not write files.
- Compiler creates the canonical site plan for the Build Engine.
- Public routes stay slug-first and do not force `/product`, `/category`, or `/post` prefixes.
- Duplicate routes fail before writing output.
- Source data becomes normalized WPSC content before themes render it.

### Must Not Do

- Call deployment targets.
- Handle customer sessions.
- Expose runtime secrets.
- Import browser runtime modules.

## Runtime Contract

The runtime handles dynamic customer workflows beside the static site.

### Owner

Runtime Kernel.

### Required API

```js
const runtime = createCommerceRuntime(options);
```

or:

```js
const server = createCommerceServer(options);
```

### Public Runtime Endpoints

```text
GET  /health
POST /api/auth/login
POST /api/auth/logout
GET  /api/account/me
GET  /api/account/orders/:orderId
POST /api/account/address
POST /api/account/profile
POST /api/account/password
GET  /cart
POST /cart/items
DELETE /cart/items/:productId
POST /checkout
GET  /orders/:orderId
```

Endpoint availability may depend on configured handlers.

### Input

- HTTP request.
- Runtime config.
- HTTP-only session cookie.
- Server-side auth/account/order/checkout handlers.
- Server-side WordPress/WooCommerce service wrappers.

### Output

- JSON runtime responses.
- HTTP-only session updates.
- Customer account/order/address data filtered by session user.
- Created checkout orders.

### Must Preserve

- Browser never chooses trusted `userId`.
- Runtime derives current user from server-side session.
- WooCommerce credentials, WP application passwords, bridge secrets, and session secrets stay server-side.
- Static HTML never embeds customer-specific private data.
- Frontend runtime code imports only browser-safe modules.

### Must Not Do

- Rebuild static pages directly.
- Serve as the only renderer for public pages.
- Leak source credentials to `dist`.
- Trust browser-provided customer identity for account/order data.

## Theme Contract

Themes render static HTML from WPSC public render context.

### Owner

Theme System.

### Config API

```js
export default {
  theme: {
    layout: "./theme/layout.js",
    layouts: {
      page: "./theme/layouts/page.js",
      product: "./theme/layouts/product.js"
    },
    components: "./theme/components/index.js",
    assets: "./theme/assets",
    blocks: "./theme/blocks/index.js",
    meta: {
      name: "Theme Name",
      version: "1.0.0"
    }
  }
};
```

### Layout API

```js
export default function layout({ components, content, graph, html, route, site, theme }) {
  return html`<main>${content.title}</main>`;
}
```

### Input

- `components`
- `content`
- `graph`
- `html`
- `route`
- `site`
- `theme`

### Output

- HTML string for the route body.
- Static asset references.
- Data attributes for browser runtime enhancement.

### Must Preserve

- Layout context fields remain stable in v1.
- Layout resolution order is `theme.layouts[content.type]`, then `theme.layout`.
- Theme assets copy to `dist/theme`.
- Theme components are ordinary JavaScript modules, not source adapters.

### Must Not Do

- Fetch WordPress/WooCommerce data directly.
- Read private runtime sessions at build time.
- Write build output.
- Change public route rules.
- Require browser runtime secrets.

## Plugin Contract

Plugins extend WPSC through declared hooks and stable context.

### Owner

Plugin System.

### Plugin Shape

```js
export default {
  name: "my-plugin",

  async data(payload, context) {
    return payload;
  },

  routes(routes, context) {
    return routes;
  },

  render(payload, context) {
    return payload;
  },

  buildStart(payload, context) {},

  buildEnd(payload, context) {}
};
```

Plugins may also export a factory function that returns this shape.

### Stable Hooks

```text
data({ contents, collections }, context)
routes(routes, context)
render({ route, html }, context)
buildStart(payload, context)
buildEnd(payload, context)
```

### Context

```js
{
  config,
  projectDir
}
```

Additional context fields may be added in v1.x, but existing fields must remain
compatible.

### Return Rules

- Transform hooks may return a replacement value.
- Returning `undefined` keeps the previous value.
- Observer hooks may return nothing.

### Must Preserve

- Plugins use declared hooks, not private Core imports.
- Plugins receive stable public context.
- Plugins may transform public data, routes, and rendered HTML through hooks.

### Must Not Do

- Mutate frozen content/graph objects in place.
- Bypass adapter/runtime security boundaries.
- Treat undocumented internal file paths as stable API.

## Compatibility Policy

During the v1 freeze, compatibility bridges may remain to avoid breaking older
imports while folder names settle.

Examples:

```text
src/incremental/* -> src/planner/* or src/graph/*
src/webhook/createRebuildQueue.js -> src/queue/createRebuildQueue.js
src/dev-server/createWatchTargets.js -> src/watcher/createWatchTargets.js
```

Public docs should prefer the new names. Bridges are compatibility helpers, not
the preferred architecture.

## Contract Checklist

- [ ] Adapter contract documented and source-safe.
- [ ] Compiler contract documents `sitePlan`.
- [ ] Runtime contract documents session and endpoint boundary.
- [ ] Theme contract documents config and layout context.
- [ ] Plugin contract documents hooks and return rules.
- [ ] Public exports in `src/index.js` line up with documented contracts.
- [ ] Internal modules remain replaceable behind public contracts.
