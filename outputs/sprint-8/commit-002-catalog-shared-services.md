# Sprint 8 Commit 002 - Catalog Shared Services Integration

Status: PASS

## Delivered

- Versioned `wpsc.commerce-catalog` composition contract.
- Deterministic Product and Product Taxonomy routes through Site Route Policy.
- WooCommerce Product Media and Variation Media exposed in the Shared Media
  shape.
- Product search documents consumable by the existing Site Search Service.
- Products, Variations, Attributes, Store presentation settings and Taxonomy
  exposed to Theme through Shared Rendering Context.
- Explicit cross-Site contract rejection.

## Flow

```text
wpsc.commerce-provider
  -> Commerce Catalog Service
  -> Routing / Media / Search
  -> Shared Rendering Context
  -> Theme
  -> Builder
```

Theme receives only normalized `wpsc.commerce-catalog` data. It does not call
WooCommerce, access credentials or interpret raw REST responses.

## Boundary

- WooCommerce remains Product, Price and Inventory authority.
- Product Variations remain part of the normalized Product experience.
- Shared Routing owns canonical route composition.
- Shared Search owns indexing/query behavior.
- Shared Media owns static media publication metadata.
- Builder ownership and Output Pipeline ownership are unchanged.

## Validation

```bash
node --test test/commerceCatalogService.test.js test/commerceProviderContract.test.js
npm test
node framework/src/cli/index.js --help
git diff --check
```

Repository result:

```text
tests    417
pass     417
fail     0
skipped  0
```
