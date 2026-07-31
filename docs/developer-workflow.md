# WPSC Developer Workflow

This guide summarizes the Sprint 2 development workflow.

## Build Once

```bash
node framework/src/cli/index.js build --project my-shop
```

The build flow is standardized as:

```text
Validate
-> Compile
-> Optimize
-> Output
```

## Watch Build

```bash
node framework/src/cli/index.js build --project my-shop --watch
```

Use watch mode when editing source files and wanting static output to rebuild automatically.

Watch mode:

- Runs an initial build.
- Watches project config, content, public assets, and theme paths.
- Debounces rapid changes.
- Avoids overlapping rebuilds.

## Incremental Build

Use `--changed` to rebuild only affected routes:

```bash
node framework/src/cli/index.js build \
  --project my-shop \
  --changed product:demo-product
```

Supported changed item examples:

```text
page:home
post:news-slug
product:demo-product
term:product_cat:dien-thoai
product_cat:dien-thoai
tag:tag-slug
```

The planner maps changed items to affected routes through the route dependency graph.

## Production Build

```bash
node framework/src/cli/index.js build --project my-shop --production
```

Production build currently:

- Runs the normal static build flow.
- Marks the build result as production.
- Writes production metadata to the build manifest.
- Includes build metrics in production metadata.

Future production mode can add minification, compression, and stricter validation.

## Build Report Foundation

Sprint 2 adds the Build Report formatter and metrics foundation.

The report model includes:

- Project summary.
- Build summary.
- Asset summary.
- Runtime output.
- Plugins.
- Pipeline stages.
- Performance metrics.
- Warnings.
- Errors.

Writing `build-report.md` directly from the build flow is intentionally left as a follow-up after existing dirty build-flow work is separated.

## Asset Pipeline

The asset pipeline currently supports remote media download/cache/rewrite and emits richer stats:

```text
cached
downloaded
total
totalBytes
byType
optimization
```

WebP conversion is represented as metadata until an encoder dependency is intentionally added.

## Performance Metrics

Metrics include:

- Pages written.
- Total pages.
- Route data written.
- Fragments written.
- Asset counts.
- Asset bytes.
- Memory RSS.
- Heap used.
- Total duration.
- Pipeline stage durations.

## Current Boundaries

Sprint 2 keeps business logic inside reusable core/build/report modules.

CLI is only an interface.

The future Web Installer should call the same core services instead of duplicating build, validation, planner, report, or production logic.
