# Sprint 7 Commit 003 - WordPress Menu Service

## Delivered

- Stable, versioned Navigation contract: `wpsc.navigation` version 1.
- WordPress menu retrieval with separately resolved menu items.
- Normalized item fields: identifier, label, URL, target, type, order,
  parent identifier and children.
- Deterministic hierarchy construction and sibling ordering.
- Same-site absolute WordPress links are converted to static-site paths.
- Normalized menus remain available in the Builder content graph and are now
  passed as `navigation` to every theme layout.

## WordPress Endpoint Compatibility

The default menu endpoints are `/wp-json/wp/v2/menus` and
`/wp-json/wp/v2/menu-items`. They can be overridden with `menuEndpoint` and
`menuItemsEndpoint` for a WordPress menu REST plugin that uses different
paths. Sites without a Menu REST endpoint receive an empty navigation
collection; they do not fail content retrieval or a Site build.

## Boundary

WordPress remains the menu editor and authority. WPSC only reads, normalizes,
orders and composes navigation; no menu CRUD, Runtime dashboard editor or
local menu persistence has been added.

Navigation is source/site-scoped: the Source Adapter reads the endpoint and
credentials belonging to the current Site Runtime, and the Navigation Service
is stateless.

## Validation

```bash
node --test test/navigationService.test.js test/wordpressAdapter.test.js test/wordpressSourceAdapter.test.js test/runtimeContentReader.test.js
node framework/src/cli/index.js --help
git diff --check
```

All focused checks pass. `test/contentGraph.test.js` still contains an
environment-dependent example compilation that resolves `api.tinsinhphat.com`;
it fails in this local sandbox due to DNS and is unrelated to navigation.
