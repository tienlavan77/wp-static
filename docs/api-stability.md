# API Stability

Status: `v1 stable`

Phase 32 marks the WPSC v1.0 release. Stable APIs must keep backward compatibility until
the next major version.

## Stable Core APIs

```js
import {
  compile,
  loadConfig,
  validateConfig,
  normalizeConfigPaths,
  createContent,
  createContentGraph,
  createRoutes,
  renderPage,
  html,
  buildSite,
  cleanOutput,
  createBuildManifest
} from "wpsc";
```

## Stable Source APIs

```js
import {
  createMockAdapter,
  createWordPressAdapter,
  createWordPressWooCommerceAdapter,
  createWooCommerceAdapter,
  resolveWordPressAuth,
  resolveWooCommerceCredentials
} from "wpsc";
```

## Stable Commerce APIs

```js
import {
  applyAdvancedCommerceData,
  createProductVariantContents,
  createCommerceCollections,
  addRelatedProducts
} from "wpsc";
```

## Stable Builder Foundation APIs

```js
import {
  createBlockRegistry,
  createBlockSchema,
  renderBlock,
  renderLayout,
  renderThemePreview,
  createLayoutDocument,
  createLayoutRevisionStore,
  createBuilderWorkflow
} from "wpsc";
```

## Stable Runtime APIs

```js
import {
  createCommerceRuntime,
  createCommerceServer,
  createSessionStore,
  resolveCustomerSession
} from "wpsc";
```

## Stable Deploy APIs

```js
import {
  createRsyncDeployPlan,
  runRsyncDeploy
} from "wpsc";
```

## Provisional APIs

Lower-level helpers such as caches, asset pipeline internals, preview helpers, account UI
helpers, and incremental build helpers remain provisional. They are exported for
composition and tests, but the stable API groups above are the v1 compatibility contract.
