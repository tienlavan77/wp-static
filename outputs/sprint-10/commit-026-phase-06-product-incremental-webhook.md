# Sprint 10 Commit 026 - Phase 6 Product Incremental Webhook

Status: PASS

## Scope

After an initial full Runtime build, the fixture changes Product 101 at the
WooCommerce HTTP boundary. The test submits a signed WooCommerce webhook to
the Runtime Webhook Receiver and advances the Scheduler once.

It validates that the real incremental flow republishes the Product route and
the affected product-category archive and the Shared Storefront homepage
Product card; it also checks the persisted dependency manifest and C023
telemetry mode. This test does not call the Builder, Output Pipeline or Build
Integration directly.

The assertion was strengthened to cover the real Shared Storefront Homepage
Product-card dependency and revalidated outside the restricted test sandbox on
2026-08-02:

```text
✔ C026 Phase 6 incrementally republishes Product and product-category output from a WooCommerce webhook (1626.200639ms)
6 passed, 0 failed
```
