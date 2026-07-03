# WPSC Mini Core

WPSC Mini Core is a small static commerce prototype for proving the build
pipeline before extracting framework packages.

## Run The Example

```bash
npm run build:example
```

Or run the CLI directly:

```bash
node src/cli/index.js build --project examples/basic-shop
node src/cli/index.js --help
node src/cli/index.js --version
```

The command reads:

```text
examples/basic-shop/content.json
examples/basic-shop/wpsc.config.js
examples/basic-shop/theme/layout.js
```

It writes static HTML to:

```text
examples/basic-shop/dist/
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
node src/cli/index.js create work/my-shop
node src/cli/index.js build --project work/my-shop
```

## Test

```bash
npm test
```
