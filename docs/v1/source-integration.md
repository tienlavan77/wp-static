# Source Integration

Status: stable in WPSC v1.0.

WPSC v1 supports source data through the stable adapter contract.

## Adapter Contract

Every adapter must provide:

- `getContents()`

Adapters can additionally provide:

- `getCollections()`
- `getCacheKey()`

## WordPress And WooCommerce

Built-in adapters normalize WordPress and WooCommerce data into WPSC content records.
Rank Math SEO fields, ACF fields, menus, media, taxonomies, products, variations, and
commerce collections are handled in the adapter layer.

## Authentication Boundary

Source credentials stay server-side in adapter configuration and environment variables.
Customer authentication stays in the runtime boundary and must not leak source credentials
to static frontend output.
