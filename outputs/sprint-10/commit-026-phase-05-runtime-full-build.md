# Sprint 10 Commit 026 - Phase 5 Runtime Full Build

Status: PASS

## Scope

The E2E test provisions an isolated Site Runtime workspace, persists combined
WordPress/WooCommerce source metadata and credentials, then drives the initial
build exclusively through the Runtime Scheduler.

Required execution path:

```text
Scheduler → Queue → Dispatcher → Build Integration → Runtime Builder
→ Output Pipeline → public/dist
```

It asserts the generated public route manifest plus the Product route and its
product-category archive. No direct Builder, Output Pipeline or Build
Integration call is made by this test.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 5 builds a combined WordPress WooCommerce Site through Runtime scheduling (2507.592315ms)
5 passed, 0 failed
```
