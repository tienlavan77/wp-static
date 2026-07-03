# WPSC Public API Draft

Status: `Draft`

The public API is exported from:

```text
src/index.js
```

## Core

```js
import {
  compile,
  loadConfig,
  validateConfig,
  normalizeConfigPaths
} from "wpsc";
```

## Builder

```js
import {
  buildSite,
  cleanOutput,
  createBuildManifest
} from "wpsc";
```

## Routing And Rendering

```js
import {
  createRoutes,
  html,
  renderPage
} from "wpsc";
```

## Adapters

```js
import {
  createMockAdapter
} from "wpsc";
```

## Errors

```js
import {
  AdapterError,
  BuildError,
  ConfigError,
  RouteError,
  WpscError
} from "wpsc";
```

## Stability

These APIs remain draft until WPSC reaches the package extraction phase.
Breaking changes are allowed while the architecture is still marked `DRAFT`.
