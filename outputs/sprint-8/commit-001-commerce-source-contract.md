# Sprint 8 Commit 001 - Commerce Source Contract

Status: PASS

## Delivered

- Versioned `wpsc.commerce-provider` contract.
- Explicit Site identity on every commerce provider document.
- Immutable normalized Products, Categories, Tags, Attributes and Store
  Configuration.
- WooCommerce Adapter support for product attributes and general store
  settings.
- `getCommerceContract()` on WooCommerce and combined
  WordPress/WooCommerce adapters.
- Runtime WordPress Source Adapter preserves the initialized Site identity when
  exposing the optional WooCommerce contract.
- Existing `getContents()` and `getCollections()` behavior remains compatible
  with Builder V1.

## Ownership

```text
WooCommerce
  -> WooCommerce Adapter
  -> wpsc.commerce-provider
  -> Shared Website Services
```

WooCommerce remains Product, Variation, Price, Inventory and Store authority.
No local Product CRUD, pricing authority or inventory authority is introduced.

## Contract

```text
schema:        wpsc.commerce-provider
schemaVersion: 1
siteId:        required
provider:      woocommerce
products:      normalized Content products
categories:    normalized product_cat terms
tags:          normalized product_tag terms
attributes:    normalized product attributes
store:         normalized public store presentation settings
```

Credentials and raw WooCommerce REST responses are never included in the
provider contract.

## Validation

```bash
node --test test/commerceProviderContract.test.js test/woocommerceAdapter.test.js test/wordpressWooCommerceAdapter.test.js test/wordpressSourceAdapter.test.js
npm test
node framework/src/cli/index.js --help
git diff --check
```

Repository result:

```text
tests    413
pass     413
fail     0
skipped  0
```
