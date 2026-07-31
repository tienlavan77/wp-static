# Sprint 8 Commit 004 - Site-scoped Cart Service

Status: PASS

## Delivered

- Versioned immutable `wpsc.cart` contract.
- Site-scoped Cart identity backed by the Customer Session id.
- Product and Variation references with deterministic item keys.
- Add, merge, update quantity, remove, clear and refresh lifecycle.
- Provider-owned price, stock and availability refresh boundary.
- Normalized item pricing and Cart totals.
- Runtime routes for read, add, update, remove, clear and refresh.
- Cross-Site Customer Session rejection.

## Runtime API

```text
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/<item-key>
PATCH  /api/cart/items/<item-key>
DELETE /api/cart/items/<item-key>
DELETE /api/cart
POST   /api/cart/refresh
```

## Authority

Browser input may select Product, Variation and Quantity only. Price,
availability and inventory state enter the Cart contract only through the
injected Commerce Provider refresh boundary.

```text
Customer Selection
  -> Site-scoped Cart Session
  -> Commerce Provider Refresh
  -> Normalized Cart Contract
```

The Cart is not Product, Price or Inventory authority.

## Validation

```bash
node --test test/cartService.test.js test/commerceRuntime.test.js test/customerIdentityRuntime.test.js
npm test
node framework/src/cli/index.js --help
git diff --check
```

Focused validation passed with 22 tests, including the HTTP lifecycle for
add/merge, provider refresh, quantity update and removal. The complete test
glob also ran through the repository tests; the local test harness did not
emit a final aggregate summary because several existing integration tests keep
long-lived runtime handles open.
