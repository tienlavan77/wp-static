# WPSC Mini Core Architecture

## Status

Architecture status: `DRAFT`

This document defines the first runnable architecture for WPSC Mini Core.
It is intentionally small. The goal is to build a working static commerce
pipeline before extracting packages or introducing real WordPress and
WooCommerce adapters.

This architecture is not frozen. A module can be marked `DONE` only after
the prototype builds the example site successfully and the design has been
used at least once end to end.

## Scope

WPSC Mini Core builds static HTML from structured content.

The first version supports:

- Loading content from a mock adapter.
- Normalizing raw records into immutable Content models.
- Creating SEO-first routes from slugs.
- Rendering routes with a plain JavaScript layout.
- Writing static HTML files into a `dist` directory.

The first version does not support:

- Server-side rendering.
- API server behavior.
- Database access.
- Authentication.
- Client-side state management.
- Plugin system.
- Dev server.
- Incremental build cache.
- Real WordPress or WooCommerce network calls.
- Monorepo package extraction.

## Primary Pipeline

There is one official pipeline for the mini core:

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

Expanded build flow:

```text
wpsc build
-> load wpsc.config.js
-> adapter.getContents()
-> createContent(rawRecord)
-> createRoutes(contents, config)
-> renderPage(route, layout)
-> buildSite(sitePlan, outputDir)
```

## Module Responsibilities

| Module | Responsibility | Must Not Do |
| --- | --- | --- |
| CLI | Read command arguments, load config, call compiler/build flow, print result. | Normalize content, render HTML, call WordPress directly. |
| Config | Describe project input, output, adapter, homepage, and theme layout. | Execute build logic or mutate content. |
| Adapter | Load raw data from a source and return Content models. | Render HTML, create routes, write output files. |
| Content | Represent normalized site content as immutable data. | Know about routes, filesystem paths, or layouts. |
| Router | Convert Content models into URL routes and output paths. | Fetch data, render templates, or write files. |
| Renderer | Convert a route and layout into an HTML document string. | Fetch data, decide output paths, or write files. |
| Builder | Write rendered HTML and static assets to the output directory. | Normalize content, create routes, or call adapters. |
| Shared | Provide dependency-free utilities used by more than one module. | Depend on any WPSC feature module. |

## Dependency Direction

Dependencies should move in one direction:

```text
CLI
-> Core
-> Adapter
-> Content
-> Router
-> Renderer
-> Builder
-> Shared
```

`Shared` is the foundation. It must not import from any other WPSC module.

The compiler may coordinate modules, but feature modules should not call back
into the compiler.

## Core Concepts

### Content

`Content` is the only model the mini compiler understands.

Minimum shape:

```js
{
  id: "product-iphone-15",
  type: "product",
  title: "iPhone 15",
  slug: "iphone-15",
  domain: "shop",
  data: {
    price: 19900000,
    description: "..."
  }
}
```

Required fields:

- `id`
- `type`
- `title`
- `slug`
- `domain`
- `data`

Content models must be immutable. The first implementation should use
`deepFreeze()`.

The compiler must not branch on WordPress-specific objects such as Page,
Post, Product, or Category. Source-specific types are normalized into
Content before routing or rendering.

### Route

A route is the renderable URL and output location for one Content model.

Minimum shape:

```js
{
  path: "/iphone-15",
  outputPath: "iphone-15/index.html",
  content: content
}
```

Routes are generated from `domain` and `slug`, but the public URL must stay
SEO-first and must not force prefixes such as `/product`, `/category`, or
`/blog`.

### Site Plan

The compiler returns a site plan instead of writing files directly.

Minimum shape:

```js
{
  routes: [],
  pages: []
}
```

The site plan is passed to the Builder. The Builder is the only module that
writes output files.

## Routing Rules

### Homepage

The homepage route is `/`.

The first version can identify homepage content by config:

```js
export default {
  homepage: "home"
}
```

When a Content model has a slug matching `homepage`, the Router creates:

```text
/
index.html
```

### Normal Slugs

A Content model with slug `iphone-15` creates:

```text
/iphone-15
iphone-15/index.html
```

### Duplicate Routes

Duplicate routes are build errors.

If two Content models resolve to the same route path, the Router must throw a
clear Error before rendering starts.

The error should include:

- The duplicate route path.
- The first content id.
- The conflicting content id.

Example:

```text
Duplicate route "/iphone-15" for content "product-iphone-15" and "page-iphone-15".
```

There is no silent override and no automatic prefix fallback in the mini core.

## Rendering Rules

The first renderer uses plain JavaScript functions.

Layout shape:

```js
export default function layout({ content, route, html }) {
  return html`
    <main>
      <h1>${content.title}</h1>
    </main>
  `;
}
```

The renderer is responsible for producing a complete HTML document:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>...</title>
  </head>
  <body>...</body>
</html>
```

The renderer must not depend on React, Next.js, JSX, or browser-only APIs.

## Builder Rules

The Builder owns filesystem output.

It may:

- Create the output directory.
- Write HTML files.
- Copy static assets later when that use case exists.

It must not:

- Fetch data.
- Normalize Content.
- Create routes.
- Render layout decisions.

## Public API Draft

The initial public API is draft-only:

```js
export { compile } from "./core/compile.js";
export { buildSite } from "./builder/buildSite.js";
export { createContent } from "./core/createContent.js";
export { createRoutes } from "./router/createRoutes.js";
export { renderPage } from "./renderer/renderPage.js";
```

This API is not stable until the prototype is complete.

## Initial File Layout

```text
wpsc/
├── src/
│   ├── cli/
│   │   └── index.js
│   ├── core/
│   │   ├── compile.js
│   │   └── createContent.js
│   ├── router/
│   │   └── createRoutes.js
│   ├── renderer/
│   │   ├── html.js
│   │   └── renderPage.js
│   ├── builder/
│   │   └── buildSite.js
│   ├── adapters/
│   │   └── mockAdapter.js
│   ├── shared/
│   │   ├── deepFreeze.js
│   │   └── escapeHtml.js
│   └── index.js
├── examples/
│   └── basic-shop/
│       ├── content.json
│       ├── theme/
│       │   └── layout.js
│       ├── wpsc.config.js
│       └── dist/
├── ARCHITECTURE.md
├── README.md
└── package.json
```

## Architecture Change Policy

During the prototype, small implementation details can change directly.

Changes require an RFC when they affect:

- Module responsibility.
- Dependency direction.
- Public API.
- Route generation behavior.
- Content model shape.
- Package extraction.
- Plugin hooks.

The first planned RFC is monorepo extraction after the mini core is proven by
the example build.

## Prototype Definition of Done

The mini core prototype is complete when:

- `npm run build:example` succeeds.
- `examples/basic-shop/dist/index.html` exists.
- At least three static HTML routes are generated.
- Duplicate slugs fail the build.
- Content models are immutable.
- The renderer has no frontend framework dependency.
- The Builder is the only module writing output files.
- `README.md` and this architecture document reflect the current behavior.
