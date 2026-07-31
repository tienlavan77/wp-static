# Sprint 8 Commit 011 - Commerce Publishing Integration

Status: PASS

## Delivered

- WooCommerce Commerce Publishing Gateway.
- Normalized Product, Variation, Category, Inventory and Price events.
- Parent Product route hints for variation, inventory and price changes.
- Product category changes remain taxonomy route hints.
- Reuse of the existing Publishing Coordinator and Scheduler entry point.
- Existing Queue, Dispatcher and Builder ownership remains unchanged.
- Existing event idempotency bounds duplicate commerce deliveries.
- Site Context is required and preserved through the publishing flow.

## Flow

```text
WooCommerce Event
  -> Commerce Publishing Gateway
  -> Publishing Coordinator
  -> Scheduler
  -> Queue
  -> Dispatcher
  -> Builder
```

The gateway only translates provider event vocabulary. It does not trigger a
Build directly, bypass Scheduler, or own incremental build policy.

## Validation

```bash
node --test test/commercePublishingGateway.test.js test/publishEventCoordinator.test.js test/webhookWorkflow.test.js test/incrementalBuild.test.js test/siteCacheService.test.js
node --check framework/src/publishing/createCommercePublishingGateway.js
git diff --check
```

Focused Commerce Gateway, Publishing Coordinator, Runtime Webhook, Scheduler
entry point, incremental build and Site Cache validation passed with 22 tests.
