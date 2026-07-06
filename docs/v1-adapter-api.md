# V1 Adapter API

Status: stable in WPSC v1.0.

Adapters connect WPSC to a data source such as local JSON, WordPress, WooCommerce, or a
custom CMS.

## Required Method

- `getContents()`: returns an array of normalized content records or raw content inputs
  accepted by `createContent`.

This required method is exported as `V1_ADAPTER_REQUIRED_METHODS`.

## Optional Methods

- `getCollections()`: returns named collections such as menus, terms, products, or source
  specific groupings.
- `getCacheKey()`: returns a stable cache identity for the current data source state.

These optional methods are exported as `V1_ADAPTER_OPTIONAL_METHODS`.

## Built-In v1 Adapters

The root package exports:

- `createMockAdapter`
- `createWordPressAdapter`
- `createWordPressWooCommerceAdapter`
- `createWooCommerceAdapter`

The adapter contract is intentionally small so new sources can be added without changing
the build pipeline.

## WordPress And WooCommerce Together

Use `createWordPressWooCommerceAdapter` or config `adapter.type: "wordpressWooCommerce"`
when the site needs WordPress pages/posts/menu/media and WooCommerce products in the same
static build.
