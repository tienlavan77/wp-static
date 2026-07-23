# Getting Started

WPSC v1.0 is a static commerce framework for building fast HTML output
from WordPress, WooCommerce, or local mock content.

## Install

During local development, run commands from the repository root:

```bash
npm test
npm run build:example
node src/cli/index.js dev --project examples/basic-shop --port 8080
```

For a new project, start with the Sprint 1 installer:

```bash
node src/cli/index.js create my-shop --template commerce
node src/cli/index.js validate --project my-shop
node src/cli/index.js build --project my-shop
```

For the full installation flow, see [Installation Guide](installation.md).

## Project Shape

```text
my-shop/
  wpsc.config.js
  content.json
  public/
  theme/
    layout.js
    layouts/
    components/
    assets/
```

## Build

```bash
node src/cli/index.js build --project examples/basic-shop
```

The build writes static output to `dist`, including:

- HTML routes
- copied public assets
- copied theme assets
- downloaded remote media assets
- `.wpsc/manifest.json`
- `.wpsc/assets.json`
- `sitemap.xml`
- `robots.txt`

## Dev

```bash
node src/cli/index.js dev --project examples/basic-shop --port 8080
```

Dev mode performs an initial build, serves the output, watches config/content/theme
paths, rebuilds on change, and injects live reload into HTML.

## Package Boundaries

The v1.0 workspace exposes stable package entrypoints:

- `@wpsc/shared`
- `@wpsc/core`
- `@wpsc/adapters`
- `@wpsc/router`
- `@wpsc/renderer`
- `@wpsc/builder`
- `@wpsc/cli`

These packages re-export the stable v1 modules while the codebase keeps physical package
extraction incremental.
