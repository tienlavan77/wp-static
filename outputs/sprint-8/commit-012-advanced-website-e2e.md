# Sprint 8 Commit 012 - Advanced Website E2E

Status: PASS

## Validated

- WooCommerce Provider Contract and Product Catalog.
- Product routes and Commerce Search.
- Theme receives normalized Commerce through Rendering Context.
- Customer login, Account, Cart and provider-owned Checkout.
- Browser-submitted order items cannot replace server-side Cart state.
- Shared Forms submission with Site Context.
- Advanced Product SEO and canonical Route Policy.
- Site-scoped Cache lifecycle and observable Performance metrics.
- Commerce event publishing through Scheduler change hints.
- Customer Session, Commerce, Search and Cache isolation across two Sites.
- Existing Sprint 7 build/output/webhook E2E remains green.

## Validation

```bash
node --test test/sprint8AdvancedWebsiteE2E.test.js test/sprint7WebsiteE2E.test.js
node --test test/commerceRuntime.test.js test/commercePublishingGateway.test.js test/siteCacheService.test.js
git diff --check
```

No live credentials, real Site configuration or production filesystem paths
are used by the E2E tests.

Sprint 8 capability validation passed with 43 tests. The dedicated Sprint 8
E2E and the existing Sprint 7 build/output/webhook E2E both passed.
