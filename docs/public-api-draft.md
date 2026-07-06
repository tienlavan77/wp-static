# WPSC Public API

Status: `v1 stabilization`

The public API is exported from:

```text
src/index.js
```

## Stable Core

```js
import {
  compile,
  loadConfig,
  validateConfig,
  normalizeConfigPaths
} from "wpsc";
```

## Stable Builder

```js
import {
  buildSite,
  cleanOutput,
  createBuildManifest
} from "wpsc";
```

## Stable Routing And Rendering

```js
import {
  createRoutes,
  html,
  renderPage
} from "wpsc";
```

## Stable Adapters

```js
import {
  createMockAdapter,
  createWordPressAdapter,
  createWooCommerceAdapter
} from "wpsc";
```

## Stable Commerce

```js
import {
  applyAdvancedCommerceData,
  createProductVariantContents,
  createCommerceCollections,
  addRelatedProducts
} from "wpsc";
```

## Stable Deployment

```js
import {
  createRsyncDeployPlan,
  runRsyncDeploy
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

The APIs listed here are stable for v1. See:

- `docs/api-stability.md`
- `docs/api-migration-policy.md`
- `docs/deprecation-policy.md`

Lower-level exports remain provisional until Phase 32 freezes the final v1 plugin, theme, and adapter boundaries.
