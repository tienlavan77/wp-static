# WPSC Mini Core

WPSC Mini Core is a small static commerce prototype for proving the build
pipeline before extracting framework packages.

## Run The Example

```bash
npm run build:example
```

Or run the CLI directly:

```bash
node framework/src/cli/index.js build --project fixtures/basic-shop
node framework/src/cli/index.js --help
node framework/src/cli/index.js --version
```

Useful project commands:

```bash
node framework/src/cli/index.js clean --project fixtures/basic-shop
node framework/src/cli/index.js doctor --project fixtures/basic-shop
node framework/src/cli/index.js serve --project fixtures/basic-shop --port 8080
```

The command reads:

```text
fixtures/basic-shop/content.json
fixtures/basic-shop/wpsc.config.js
fixtures/basic-shop/theme/layout.js
```

It writes static HTML to:

```text
fixtures/basic-shop/dist/
```

The npm scripts run the CLI entry:

```text
src/cli/index.js
```

The library API is exported from:

```text
src/index.js
```

## Current Scope

- Mock JSON adapter.
- Immutable Content model.
- SEO-first slug routing.
- Plain JavaScript layout rendering.
- Static HTML builder.
- Public asset copying.
- Project template creation.

Not included yet:

- Real WordPress adapter.
- Real WooCommerce adapter.
- Dev server.
- Plugin system.
- Incremental build cache.

## Create A Project

```bash
node framework/src/cli/index.js create work/my-shop
node framework/src/cli/index.js build --project work/my-shop
```

## Test

```bash
npm test
```
